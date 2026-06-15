import {
  listTokens,
  migrateLegacyTokens,
  registerToken,
  revokeToken,
  revokeTokens,
} from './tokenStore';

// canada.ca (Akamai) rejects Cloudflare Worker egress with HTTP 520, so the
// worker reads the latest draw from a GitHub Actions mirror (raw.githubusercontent)
// rather than polling IRCC directly. See .github/workflows/ircc-mirror.yml.
const DRAW_MIRROR_URL =
  'https://raw.githubusercontent.com/BalwinderCa/crs-pulse/main/data/latest-draw.json';
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const LAST_DRAW_KEY = 'last_draw_number';

const CATEGORY_MAP: Record<string, string> = {
  'No Program Specified': 'General',
  'Canadian Experience Class': 'CEC',
  'Federal Skilled Worker': 'General',
  'Federal Skilled Trades': 'Trades',
  'Provincial Nominee Program': 'PNP',
  'Targeted Draw: Healthcare Occupations': 'Healthcare',
  'Targeted Draw: STEM Occupations': 'STEM',
  'Targeted Draw: French language proficiency': 'French',
  'Targeted Draw: Trade Occupations': 'Trades',
  'Targeted Draw: Agriculture and Agri-food Occupations': 'Agriculture',
  'Targeted Draw: Education Occupations': 'Education',
};

export interface Env {
  TOKENS_KV: KVNamespace;
  /**
   * Protects POST /register and DELETE /revoke. REQUIRED in production —
   * both endpoints return 503 until it is set via
   * `wrangler secret put PUSH_API_SECRET`.
   */
  PUSH_API_SECRET?: string;
  /** Protects POST /sync. Set via `wrangler secret put SYNC_SECRET`. */
  SYNC_SECRET?: string;
}

const EXPO_TOKEN_RE = /^(ExponentPushToken|ExpoPushToken)\[[^\]]+\]$/;

interface LatestDraw {
  draw_number: number;
  cutoff: number;
  category: string;
}

function mapCategory(name: string): string {
  for (const [key, val] of Object.entries(CATEGORY_MAP)) {
    const needle = key.toLowerCase().replace('targeted draw: ', '');
    if (name.toLowerCase().includes(needle) || name.toLowerCase().includes(key.toLowerCase())) {
      return val;
    }
  }
  if (/french/i.test(name)) return 'French';
  if (/stem/i.test(name)) return 'STEM';
  if (/health/i.test(name)) return 'Healthcare';
  if (/trade/i.test(name)) return 'Trades';
  if (/agri/i.test(name)) return 'Agriculture';
  if (/cec/i.test(name)) return 'CEC';
  return 'General';
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

// ─── Rate limiting ────────────────────────────────────────────────────────────
// The mobile client embeds the (necessarily public) bearer key in its bundle, so
// the key alone cannot gate abuse. A per-IP fixed-window counter in KV throttles
// register/revoke floods. Fails OPEN: a KV hiccup must never lock out a real
// device. Keys TTL-expire so the window self-cleans.
const RL_PREFIX = 'rl:';
const RL_WINDOW_SECONDS = 60;
const RL_MAX_REQUESTS = 60;

async function isRateLimited(kv: KVNamespace, request: Request, route: string): Promise<boolean> {
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  const key = `${RL_PREFIX}${route}:${ip}`;
  try {
    const count = parseInt((await kv.get(key)) ?? '0', 10) + 1;
    if (count > RL_MAX_REQUESTS) return true;
    await kv.put(key, String(count), { expirationTtl: RL_WINDOW_SECONDS });
    return false;
  } catch {
    return false; // fail open — never lock out a legitimate device on KV error
  }
}

/** Constant-time string comparison (length is not hidden, contents are). */
function timingSafeEqualStr(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  if (ab.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ab.length; i++) diff |= ab[i]! ^ bb[i]!;
  return diff === 0;
}

/**
 * Fails CLOSED: a missing secret means the endpoint is not available, never
 * that it is open. Callers should respond 503 when the secret is unset.
 */
function isAuthorized(request: Request, secret: string | undefined): boolean {
  if (!secret) return false;
  const auth = request.headers.get('Authorization');
  if (!auth) return false;
  return timingSafeEqualStr(auth, `Bearer ${secret}`);
}

function isValidExpoToken(token: string): boolean {
  return EXPO_TOKEN_RE.test(token) && token.length <= 256;
}

function corsPreflight(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

async function fetchLatestDraw(): Promise<LatestDraw | null> {
  const res = await fetch(DRAW_MIRROR_URL, {
    headers: { Accept: 'application/json' },
    cf: { cacheTtl: 60, cacheEverything: true },
  });
  if (!res.ok) return null;

  let r: { drawNumber?: string; drawCRS?: string; drawName?: string };
  try {
    r = (await res.json()) as { drawNumber?: string; drawCRS?: string; drawName?: string };
  } catch {
    return null;
  }

  const num = parseInt(r.drawNumber ?? '', 10);
  const cutoff = parseInt((r.drawCRS ?? '').replace(/,/g, ''), 10);
  if (!num || !cutoff) return null;

  return { draw_number: num, cutoff, category: mapCategory(r.drawName ?? '') };
}

interface ExpoTicket {
  status: 'ok' | 'error';
  details?: { error?: string };
}

/**
 * Fans out to Expo in 100-message chunks and returns the tokens Expo reports as
 * `DeviceNotRegistered` so the caller can prune them. Pruning keeps the KV
 * registry from accumulating dead tokens (uninstalls, revoked grants) over time.
 */
async function sendExpoPush(
  tokens: string[],
  title: string,
  body: string,
  data: Record<string, string>,
): Promise<string[]> {
  const unregistered: string[] = [];

  for (let i = 0; i < tokens.length; i += 100) {
    const chunk = tokens.slice(i, i + 100);
    const messages = chunk.map((to) => ({
      to,
      title,
      body,
      data,
      sound: 'default',
      priority: 'high',
    }));

    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(messages),
    });

    if (!res.ok) continue;

    try {
      const payload = (await res.json()) as { data?: ExpoTicket[] };
      const tickets = payload.data ?? [];
      tickets.forEach((ticket, idx) => {
        if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
          const bad = chunk[idx];
          if (bad) unregistered.push(bad);
        }
      });
    } catch {
      // Non-JSON response — nothing to prune from this chunk.
    }
  }

  return unregistered;
}

async function checkAndNotify(kv: KVNamespace): Promise<{
  notified: boolean;
  draw_number?: number;
  token_count?: number;
}> {
  // Fold any legacy single-array registry into per-token keys before reading.
  await migrateLegacyTokens(kv, isValidExpoToken);

  const latest = await fetchLatestDraw();
  if (!latest) return { notified: false };

  const lastSeenRaw = await kv.get(LAST_DRAW_KEY);
  const lastSeen = lastSeenRaw ? parseInt(lastSeenRaw, 10) : 0;

  // First run: record current draw without alerting existing users
  if (lastSeen === 0) {
    await kv.put(LAST_DRAW_KEY, String(latest.draw_number));
    return { notified: false, draw_number: latest.draw_number };
  }

  if (latest.draw_number <= lastSeen) {
    return { notified: false, draw_number: latest.draw_number };
  }

  await kv.put(LAST_DRAW_KEY, String(latest.draw_number));

  const tokens = await listTokens(kv);
  if (tokens.length === 0) {
    return { notified: false, draw_number: latest.draw_number, token_count: 0 };
  }

  const title = `New Express Entry Draw #${latest.draw_number}`;
  const body = `${latest.category} — Cutoff: ${latest.cutoff} points`;

  const unregistered = await sendExpoPush(tokens, title, body, {
    type: 'new_draw',
    draw_number: String(latest.draw_number),
    cutoff: String(latest.cutoff),
    category: latest.category,
  });

  if (unregistered.length > 0) {
    await revokeTokens(kv, unregistered);
  }

  return { notified: true, draw_number: latest.draw_number, token_count: tokens.length };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') return corsPreflight();

    const url = new URL(request.url);

    if (url.pathname === '/health' && request.method === 'GET') {
      return json({ status: 'ok', service: 'crs-pulse-push' });
    }

    if (url.pathname === '/register' && request.method === 'POST') {
      if (!env.PUSH_API_SECRET) {
        return json({ message: 'Service unavailable' }, 503);
      }
      if (!isAuthorized(request, env.PUSH_API_SECRET)) {
        return json({ message: 'Unauthorized' }, 401);
      }
      if (await isRateLimited(env.TOKENS_KV, request, 'register')) {
        return json({ message: 'Too many requests' }, 429);
      }

      let body: { token?: string; platform?: string };
      try {
        body = (await request.json()) as { token?: string; platform?: string };
      } catch {
        return json({ message: 'Invalid JSON body' }, 400);
      }

      if (!body.token || !body.platform) {
        return json({ message: 'token and platform are required' }, 422);
      }
      if (body.platform !== 'ios' && body.platform !== 'android') {
        return json({ message: 'platform must be ios or android' }, 422);
      }
      if (!isValidExpoToken(body.token)) {
        return json({ message: 'Invalid Expo push token format' }, 422);
      }

      try {
        await registerToken(env.TOKENS_KV, body.token, body.platform);
      } catch {
        return json({ message: 'Token registry unavailable' }, 503);
      }
      return json({ message: 'Push token registered.' });
    }

    if (url.pathname === '/revoke' && request.method === 'DELETE') {
      if (!env.PUSH_API_SECRET) {
        return json({ message: 'Service unavailable' }, 503);
      }
      if (!isAuthorized(request, env.PUSH_API_SECRET)) {
        return json({ message: 'Unauthorized' }, 401);
      }
      if (await isRateLimited(env.TOKENS_KV, request, 'revoke')) {
        return json({ message: 'Too many requests' }, 429);
      }

      let body: { token?: string };
      try {
        body = (await request.json()) as { token?: string };
      } catch {
        return json({ message: 'Invalid JSON body' }, 400);
      }

      if (!body.token) return json({ message: 'token is required' }, 422);
      if (!isValidExpoToken(body.token)) {
        return json({ message: 'Invalid Expo push token format' }, 422);
      }

      await revokeToken(env.TOKENS_KV, body.token);
      return json({ message: 'Push token revoked.' });
    }

    if (url.pathname === '/sync' && request.method === 'POST') {
      if (!env.SYNC_SECRET) {
        return json({ message: 'SYNC_SECRET not configured' }, 503);
      }
      if (!isAuthorized(request, env.SYNC_SECRET)) {
        return json({ message: 'Unauthorized' }, 401);
      }
      const result = await checkAndNotify(env.TOKENS_KV);
      return json(result);
    }

    return json({ message: 'Not found' }, 404);
  },

  async scheduled(_event: ScheduledEvent, env: Env): Promise<void> {
    await checkAndNotify(env.TOKENS_KV);
  },
};
