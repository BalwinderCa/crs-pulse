/// <reference types="@cloudflare/workers-types" />

/**
 * Push-token registry.
 *
 * Tokens are stored one-per-KV-key (`token:<expoToken>` → platform) instead of
 * a single JSON array. The previous array model did read-modify-write on one
 * key, so concurrent registrations raced and silently dropped each other under
 * load (launch-day install spikes). Per-key writes touch distinct keys and are
 * therefore race-free and idempotent, and they sidestep the 25 MB single-value
 * KV limit.
 */

export const TOKEN_PREFIX = 'token:';
export const LEGACY_TOKENS_KEY = 'tokens';
export const REVOKED_PREFIX = 'revoked:';
export const RECEIPT_PREFIX = 'receipt:';

/**
 * How long a pending push receipt is kept before it's given up on. Expo retains
 * receipts for roughly a day; a receipt unresolved past that will never resolve,
 * so KV auto-expires it and the next poll stops looking for it.
 */
export const RECEIPT_TTL_SECONDS = 60 * 60 * 24;

/**
 * How long a revocation tombstone lives. It only needs to outlast the window
 * between a worker redeploy and the next cron-driven legacy migration (≤15 min),
 * so an hour is a comfortable margin. KV auto-expires it afterwards.
 */
export const REVOKED_TTL_SECONDS = 60 * 60;

async function isRevoked(kv: KVNamespace, token: string): Promise<boolean> {
  return (await kv.get(REVOKED_PREFIX + token)) !== null;
}

export type Platform = 'ios' | 'android';

export interface StoredToken {
  token: string;
  platform: Platform;
}

/** True when the token is already in the live registry. */
export async function hasToken(kv: KVNamespace, token: string): Promise<boolean> {
  return (await kv.get(TOKEN_PREFIX + token)) !== null;
}

/** Idempotent and race-free: a single put to a token-scoped key. */
export async function registerToken(
  kv: KVNamespace,
  token: string,
  platform: Platform,
): Promise<void> {
  await kv.put(TOKEN_PREFIX + token, platform);
}

export async function revokeToken(kv: KVNamespace, token: string): Promise<void> {
  // Drop the live key and leave a short-lived tombstone so a legacy migration
  // that hasn't run yet won't resurrect a token revoked during the transition
  // window. The tombstone TTL-expires on its own.
  await Promise.all([
    kv.delete(TOKEN_PREFIX + token),
    kv.put(REVOKED_PREFIX + token, '1', { expirationTtl: REVOKED_TTL_SECONDS }),
  ]);
}

/** Lists every registered token, paginating through KV. */
export async function listTokens(kv: KVNamespace): Promise<string[]> {
  const tokens: string[] = [];
  let cursor: string | undefined;
  do {
    const res = await kv.list({ prefix: TOKEN_PREFIX, cursor });
    for (const key of res.keys) {
      tokens.push(key.name.slice(TOKEN_PREFIX.length));
    }
    cursor = res.list_complete ? undefined : res.cursor;
  } while (cursor);
  return tokens;
}

/** Deletes a batch of tokens (e.g. those Expo reports as unregistered). */
export async function revokeTokens(kv: KVNamespace, tokens: string[]): Promise<void> {
  await Promise.all(tokens.map((t) => revokeToken(kv, t)));
}

// ─── Push receipts ──────────────────────────────────────────────────────────
// A push "ticket" returned at send time only confirms Expo queued the message.
// Final delivery status (notably `DeviceNotRegistered` for uninstalled apps)
// arrives in a "receipt" minutes later. We park each ticket id -> token here so
// a later poll can fetch the receipts and prune tokens that failed to deliver.

/**
 * Parks ticket ids (mapped to their token) for a later receipt poll.
 *
 * The token is encoded into the KEY (`receipt:<id>:<token>`, value `1`) rather
 * than stored as the value, so `listReceipts` can recover it from `kv.list`
 * alone — no per-key `kv.get`. Expo ticket ids are colon-free UUIDs, so the
 * first `:` after the prefix unambiguously separates id from token.
 */
export async function storeReceipts(
  kv: KVNamespace,
  receipts: { id: string; token: string }[],
): Promise<void> {
  await Promise.all(
    receipts.map((r) =>
      kv.put(`${RECEIPT_PREFIX}${r.id}:${r.token}`, '1', { expirationTtl: RECEIPT_TTL_SECONDS }),
    ),
  );
}

/**
 * Lists every pending receipt as `{ id, token }`, paginating through KV.
 *
 * Reads the id+token straight from each key name (no per-key `get`). Falls back
 * to a `get` only for legacy `receipt:<id>` keys (token-as-value) that may still
 * be parked in KV from before the key-encoded format — these TTL-expire within
 * a day, after which the fallback is never taken.
 */
export async function listReceipts(kv: KVNamespace): Promise<{ id: string; token: string }[]> {
  const out: { id: string; token: string }[] = [];
  let cursor: string | undefined;
  do {
    const res = await kv.list({ prefix: RECEIPT_PREFIX, cursor });
    for (const key of res.keys) {
      const rest = key.name.slice(RECEIPT_PREFIX.length);
      const sep = rest.indexOf(':');
      if (sep === -1) {
        // Legacy format: token is the value. Back-compat read during transition.
        const token = await kv.get(key.name);
        if (token) out.push({ id: rest, token });
      } else {
        out.push({ id: rest.slice(0, sep), token: rest.slice(sep + 1) });
      }
    }
    cursor = res.list_complete ? undefined : res.cursor;
  } while (cursor);
  return out;
}

/**
 * Drops a resolved (or abandoned) receipt. Deletes both the key-encoded form
 * (`receipt:<id>:<token>`) and the legacy `receipt:<id>` form so a receipt
 * parked under either layout is cleaned up. `token` is optional only so legacy
 * callers keep compiling; always pass it for the key-encoded format.
 */
export async function deleteReceipt(kv: KVNamespace, id: string, token?: string): Promise<void> {
  await Promise.all([
    token ? kv.delete(`${RECEIPT_PREFIX}${id}:${token}`) : Promise.resolve(),
    kv.delete(RECEIPT_PREFIX + id),
  ]);
}

/**
 * One-time migration of the legacy single-array `tokens` key into per-token
 * keys. Safe to call repeatedly — a no-op once the legacy key is gone.
 * Returns the number of tokens migrated.
 */
export async function migrateLegacyTokens(
  kv: KVNamespace,
  isValid: (token: string) => boolean,
): Promise<number> {
  const raw = await kv.get(LEGACY_TOKENS_KEY);
  if (!raw) return 0;

  let migrated = 0;
  try {
    const parsed = JSON.parse(raw) as StoredToken[];
    if (Array.isArray(parsed)) {
      for (const entry of parsed) {
        if (entry && typeof entry.token === 'string' && isValid(entry.token)) {
          // Skip tokens revoked during the transition window — don't resurrect.
          if (await isRevoked(kv, entry.token)) continue;
          await registerToken(kv, entry.token, entry.platform === 'ios' ? 'ios' : 'android');
          migrated++;
        }
      }
    }
  } catch {
    // Corrupt legacy blob — drop it below rather than leave it lingering.
  }

  await kv.delete(LEGACY_TOKENS_KEY);
  return migrated;
}
