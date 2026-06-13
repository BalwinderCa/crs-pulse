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

export type Platform = 'ios' | 'android';

export interface StoredToken {
  token: string;
  platform: Platform;
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
  await kv.delete(TOKEN_PREFIX + token);
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
