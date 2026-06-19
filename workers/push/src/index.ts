import {
  hasToken,
  listTokens,
  migrateLegacyTokens,
  registerToken,
  revokeToken,
  revokeTokens,
  storeReceipts,
  listReceipts,
  deleteReceipt,
  registerEmail,
  revokeEmail,
  listEmails,
} from './tokenStore';
import { validateTokenWithExpo } from './expoValidate';
import { fetchExpoReceipts } from './expoReceipts';

// canada.ca (Akamai) rejects Cloudflare Worker egress with HTTP 520, so the
// worker reads the latest draw from a GitHub Actions mirror (raw.githubusercontent)
// rather than polling IRCC directly. See .github/workflows/ircc-mirror.yml.
const DRAW_MIRROR_URL =
  'https://raw.githubusercontent.com/BalwinderCa/crs-pulse/main/data/latest-draw.json';
const PROCESSING_TIMES_MIRROR_URL =
  'https://raw.githubusercontent.com/BalwinderCa/crs-pulse/main/data/processing-times.json';
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const LAST_DRAW_KEY = 'last_draw_number';
const PROCESSING_TIMES_KEY = 'processing_times_months';

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
  /** Resend API key for email draw notifications. Optional — email dispatch is skipped when unset. */
  RESEND_API_KEY?: string;
  /** From address for email notifications, e.g. "CRS Pulse <alerts@yourdomain.com>". */
  EMAIL_FROM?: string;
}

const EXPO_TOKEN_RE = /^(ExponentPushToken|ExpoPushToken)\[[^\]]+\]$/;

interface LatestDraw {
  draw_number: number;
  cutoff: number;
  category: string;
  /** Full official round name, e.g. "French-Language proficiency 2026-Version 2". */
  name: string;
  /** Draw date as published (YYYY-MM-DD), or '' if absent. */
  date: string;
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

/**
 * The only legitimate client is the native mobile app, which is not subject to
 * the browser same-origin policy and never sends CORS preflights. Deliberately
 * NOT advertising `Access-Control-Allow-Origin` means a browser's preflight
 * fails, so arbitrary websites cannot drive the (bundled, necessarily public)
 * bearer key to trigger register/revoke side effects cross-origin. Defense in
 * depth on top of the per-IP rate limiter.
 */
function corsPreflight(): Response {
  return new Response(null, { status: 204 });
}

async function fetchLatestDraw(): Promise<LatestDraw | null> {
  const res = await fetch(DRAW_MIRROR_URL, {
    headers: { Accept: 'application/json' },
    cf: { cacheTtl: 60, cacheEverything: true },
  });
  if (!res.ok) return null;

  let r: { drawNumber?: string; drawCRS?: string; drawName?: string; drawDate?: string };
  try {
    r = (await res.json()) as {
      drawNumber?: string;
      drawCRS?: string;
      drawName?: string;
      drawDate?: string;
    };
  } catch {
    return null;
  }

  const num = parseInt(r.drawNumber ?? '', 10);
  const cutoff = parseInt((r.drawCRS ?? '').replace(/,/g, ''), 10);
  if (!num || !cutoff) return null;

  const name = (r.drawName ?? '').trim();
  return {
    draw_number: num,
    cutoff,
    category: mapCategory(name),
    name,
    date: (r.drawDate ?? '').trim(),
  };
}

interface ProcessingTimesFeed {
  times?: Record<string, { months?: number }>;
}

/**
 * Fetches the processing-times mirror and reduces it to a stable id→months map.
 * `peopleWaiting` is deliberately dropped — it drifts on every refresh and would
 * make each poll look like a change. Returns null on any fetch/parse failure or
 * an empty/unexpected payload, so callers treat it as "no signal".
 */
async function fetchProcessingTimesMonths(): Promise<Record<string, number> | null> {
  const res = await fetch(PROCESSING_TIMES_MIRROR_URL, {
    headers: { Accept: 'application/json' },
    cf: { cacheTtl: 60, cacheEverything: true },
  });
  if (!res.ok) return null;

  let feed: ProcessingTimesFeed;
  try {
    feed = (await res.json()) as ProcessingTimesFeed;
  } catch {
    return null;
  }
  if (!feed.times || typeof feed.times !== 'object') return null;

  const months: Record<string, number> = {};
  for (const [id, value] of Object.entries(feed.times)) {
    if (value && typeof value.months === 'number') months[id] = value.months;
  }
  return Object.keys(months).length > 0 ? months : null;
}

interface ExpoTicket {
  status: 'ok' | 'error';
  id?: string;
  details?: { error?: string };
}

interface SendResult {
  /** Tokens Expo rejected synchronously (prune immediately). */
  unregistered: string[];
  /** Ticket ids for accepted messages, mapped to their token, for later receipt polling. */
  receipts: { id: string; token: string }[];
}

/**
 * Fans out to Expo in 100-message chunks. Returns tokens Expo rejects at send
 * time (`DeviceNotRegistered` in the ticket) for immediate pruning, plus the
 * accepted tickets' receipt ids mapped to their token — final delivery failures
 * (the common `DeviceNotRegistered` case) only surface later in the receipt and
 * are pruned by the receipt poll.
 */
async function sendExpoPush(
  tokens: string[],
  title: string,
  body: string,
  data: Record<string, string>,
): Promise<SendResult> {
  const unregistered: string[] = [];
  const receipts: { id: string; token: string }[] = [];

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
        const token = chunk[idx];
        if (!token) return;
        if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
          unregistered.push(token);
        } else if (ticket.status === 'ok' && ticket.id) {
          receipts.push({ id: ticket.id, token });
        }
      });
    } catch {
      // Non-JSON response — nothing to prune or track from this chunk.
    }
  }

  return { unregistered, receipts };
}

/**
 * Polls Expo for the receipts parked by previous sends and prunes tokens that
 * failed to deliver with `DeviceNotRegistered`. Receipts Expo hasn't resolved
 * yet are left in place for the next run; resolved ones are dropped. This is the
 * authoritative dead-token cleanup — send-time tickets rarely carry the error.
 */
async function processReceipts(kv: KVNamespace): Promise<void> {
  const pending = await listReceipts(kv);
  if (pending.length === 0) return;

  const toRevoke: string[] = [];
  const resolved: { id: string; token: string }[] = [];

  // Expo accepts up to 1000 receipt ids per request.
  for (let i = 0; i < pending.length; i += 1000) {
    const batch = pending.slice(i, i + 1000);
    const receipts = await fetchExpoReceipts(batch.map((p) => p.id));
    for (const { id, token } of batch) {
      const receipt = receipts[id];
      if (!receipt) continue; // not resolved yet — keep for next poll
      resolved.push({ id, token });
      if (receipt.status === 'error' && receipt.details?.error === 'DeviceNotRegistered') {
        toRevoke.push(token);
      }
    }
  }

  if (toRevoke.length > 0) await revokeTokens(kv, toRevoke);
  await Promise.all(resolved.map((r) => deleteReceipt(kv, r.id, r.token)));
}

const SITE_URL = 'https://crspulse.com';
const BRAND_ACCENT = '#1A6DFF'; // matches the app's notification accent

interface EmailContent {
  subject: string;
  /** Small uppercase kicker above the heading, e.g. "EXPRESS ENTRY DRAW". */
  kicker: string;
  heading: string;
  /** Lead paragraph under the heading. */
  intro: string;
  /** Optional label/value detail rows, rendered as a table (used for draws). */
  rows?: { label: string; value: string }[];
  /** Call-to-action button label; the button always links to SITE_URL. */
  ctaLabel: string;
}

/** Escapes user/feed-derived strings before interpolating into HTML. */
function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const FOOTER_TEXT =
  "You're receiving this because Email Alerts are on in CRS Pulse — turn them off in the app to unsubscribe. Estimates only; always verify with the official IRCC tools.";

function renderEmailHtml(c: EmailContent): string {
  const rows = (c.rows ?? [])
    .map(
      (r) =>
        `<tr><td style="padding:7px 0;color:#64748b;font-size:14px;">${esc(r.label)}</td>` +
        `<td style="padding:7px 0;color:#0f172a;font-size:14px;font-weight:600;text-align:right;">${esc(r.value)}</td></tr>`,
    )
    .join('');
  const table = rows
    ? `<table role="presentation" width="100%" style="border-collapse:collapse;margin:18px 0;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;">${rows}</table>`
    : '';

  return `<!doctype html><html><body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" style="border-collapse:collapse;background:#f1f5f9;padding:24px 0;"><tr><td align="center">
<table role="presentation" width="100%" style="max-width:480px;border-collapse:collapse;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
<tr><td style="background:${BRAND_ACCENT};padding:18px 24px;"><span style="color:#ffffff;font-size:18px;font-weight:800;letter-spacing:-0.3px;">CRS Pulse</span></td></tr>
<tr><td style="padding:24px;">
<div style="color:${BRAND_ACCENT};font-size:12px;font-weight:700;letter-spacing:0.8px;">${esc(c.kicker)}</div>
<h1 style="margin:6px 0 10px;color:#0f172a;font-size:20px;font-weight:800;">${esc(c.heading)}</h1>
<p style="margin:0;color:#475569;font-size:15px;line-height:22px;">${esc(c.intro)}</p>
${table}
<a href="${SITE_URL}" style="display:inline-block;margin-top:8px;background:${BRAND_ACCENT};color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:12px 22px;border-radius:8px;">${esc(c.ctaLabel)} &rarr;</a>
</td></tr>
<tr><td style="padding:16px 24px;border-top:1px solid #e2e8f0;"><p style="margin:0;color:#94a3b8;font-size:12px;line-height:18px;">${FOOTER_TEXT}</p></td></tr>
</table></td></tr></table></body></html>`;
}

function renderEmailText(c: EmailContent): string {
  const lines = [c.heading, '', c.intro];
  for (const r of c.rows ?? []) lines.push(`${r.label}: ${r.value}`);
  lines.push('', `${c.ctaLabel}: ${SITE_URL}`, '', FOOTER_TEXT);
  return lines.join('\n');
}

async function sendEmailNotifications(kv: KVNamespace, env: Env, content: EmailContent): Promise<void> {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) return;
  const emails = await listEmails(kv);
  if (emails.length === 0) return;

  const html = renderEmailHtml(content);
  const text = renderEmailText(content); // plain-text fallback aids deliverability

  await Promise.allSettled(
    emails.map((to) =>
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from: env.EMAIL_FROM, to: [to], subject: content.subject, html, text }),
      }),
    ),
  );
}

async function checkAndNotify(kv: KVNamespace, env?: Env): Promise<{
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

  const { unregistered, receipts } = await sendExpoPush(tokens, title, body, {
    type: 'new_draw',
    draw_number: String(latest.draw_number),
    cutoff: String(latest.cutoff),
    category: latest.category,
  });

  if (unregistered.length > 0) {
    await revokeTokens(kv, unregistered);
  }
  // Park accepted tickets so a later poll can prune devices that fail delivery.
  if (receipts.length > 0) {
    await storeReceipts(kv, receipts);
  }

  // Also dispatch email notifications (no-op when RESEND_API_KEY is unset).
  if (env) {
    const rows = [
      { label: 'Category', value: latest.name || latest.category },
      { label: 'CRS cutoff', value: String(latest.cutoff) },
    ];
    if (latest.date) rows.push({ label: 'Date', value: latest.date });
    await sendEmailNotifications(kv, env, {
      subject: `New Express Entry Draw #${latest.draw_number} — CRS ${latest.cutoff}`,
      kicker: 'EXPRESS ENTRY DRAW',
      heading: `Draw #${latest.draw_number}`,
      intro: 'IRCC just published a new round of invitations. Here are the details:',
      rows,
      ctaLabel: 'View on CRS Pulse',
    });
  }

  return { notified: true, draw_number: latest.draw_number, token_count: tokens.length };
}

/**
 * Emails subscribers when IRCC's Express Entry processing-time estimates change.
 *
 * Email-only by design: there is no free push channel for processing times (the
 * free push notification is draw-only), so this no-ops entirely when email
 * dispatch isn't configured. It compares a key-sorted snapshot of id→months
 * against the KV baseline; the first run records the baseline silently so
 * existing subscribers aren't alerted on rollout.
 */
async function checkProcessingTimes(kv: KVNamespace, env: Env): Promise<{ changed: boolean }> {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) return { changed: false };

  const current = await fetchProcessingTimesMonths();
  if (!current) return { changed: false };

  // An array replacer both whitelists and orders the keys, so the signature is
  // deterministic regardless of the order the mirror serialises them in.
  const signature = JSON.stringify(current, Object.keys(current).sort());
  const previous = await kv.get(PROCESSING_TIMES_KEY);

  // First run: record the baseline without alerting existing subscribers.
  if (previous === null) {
    await kv.put(PROCESSING_TIMES_KEY, signature);
    return { changed: false };
  }
  if (previous === signature) return { changed: false };

  await kv.put(PROCESSING_TIMES_KEY, signature);

  const emails = await listEmails(kv);
  if (emails.length > 0) {
    await sendEmailNotifications(kv, env, {
      subject: 'IRCC processing times updated',
      kicker: 'PROCESSING TIMES',
      heading: 'Processing times updated',
      intro:
        'IRCC has updated its Express Entry processing-time estimates. Open CRS Pulse to see the latest timelines for your application.',
      ctaLabel: 'See the latest times',
    });
  }
  return { changed: true };
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

      // The client re-registers on every launch; skip the Expo probe (and its
      // silent validation push) when the token is already in the registry.
      let alreadyRegistered = false;
      try {
        alreadyRegistered = await hasToken(env.TOKENS_KV, body.token);
      } catch {
        // KV read failed — fall through and validate as if new.
      }

      // Reject tokens Expo synchronously flags as invalid (fails open on Expo
      // outages so a real device is never blocked).
      if (!alreadyRegistered && !(await validateTokenWithExpo(body.token))) {
        return json({ message: 'Push token rejected by Expo' }, 422);
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

    if (url.pathname === '/register-email' && request.method === 'POST') {
      if (!env.PUSH_API_SECRET) return json({ message: 'Service unavailable' }, 503);
      if (!isAuthorized(request, env.PUSH_API_SECRET)) return json({ message: 'Unauthorized' }, 401);
      if (await isRateLimited(env.TOKENS_KV, request, 'register-email')) {
        return json({ message: 'Too many requests' }, 429);
      }

      let body: { email?: string };
      try { body = (await request.json()) as { email?: string }; }
      catch { return json({ message: 'Invalid JSON body' }, 400); }

      const email = (body.email ?? '').trim().toLowerCase();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 320) {
        return json({ message: 'Invalid email address' }, 422);
      }

      await registerEmail(env.TOKENS_KV, email);
      return json({ message: 'Email registered.' });
    }

    if (url.pathname === '/revoke-email' && request.method === 'DELETE') {
      if (!env.PUSH_API_SECRET) return json({ message: 'Service unavailable' }, 503);
      if (!isAuthorized(request, env.PUSH_API_SECRET)) return json({ message: 'Unauthorized' }, 401);
      if (await isRateLimited(env.TOKENS_KV, request, 'revoke-email')) {
        return json({ message: 'Too many requests' }, 429);
      }

      let body: { email?: string };
      try { body = (await request.json()) as { email?: string }; }
      catch { return json({ message: 'Invalid JSON body' }, 400); }

      const email = (body.email ?? '').trim().toLowerCase();
      if (!email) return json({ message: 'email is required' }, 422);

      await revokeEmail(env.TOKENS_KV, email);
      return json({ message: 'Email revoked.' });
    }

    if (url.pathname === '/sync' && request.method === 'POST') {
      if (!env.SYNC_SECRET) {
        return json({ message: 'SYNC_SECRET not configured' }, 503);
      }
      if (!isAuthorized(request, env.SYNC_SECRET)) {
        return json({ message: 'Unauthorized' }, 401);
      }
      // Resolve any outstanding delivery receipts, then check for a new draw
      // and a processing-times change.
      await processReceipts(env.TOKENS_KV);
      const result = await checkAndNotify(env.TOKENS_KV, env);
      const proc = await checkProcessingTimes(env.TOKENS_KV, env);
      return json({ ...result, processing_times_changed: proc.changed });
    }

    return json({ message: 'Not found' }, 404);
  },

  async scheduled(_event: ScheduledEvent, env: Env): Promise<void> {
    // Prune devices that failed delivery on the previous draw, then notify on a
    // new draw and on any IRCC processing-times change (email subscribers only).
    await processReceipts(env.TOKENS_KV);
    await checkAndNotify(env.TOKENS_KV, env);
    await checkProcessingTimes(env.TOKENS_KV, env);
  },
};
