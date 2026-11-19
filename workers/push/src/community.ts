/**
 * Community timelines (D1 binding COMMUNITY_DB). Routes, all behind the app's
 * PUSH_API_SECRET bearer:
 *
 *   GET    /community?program=&aor=&stage=&sort=&cursor=&limit=  → { items, nextCursor }
 *   GET    /community/summary?program=cec                        → [{ stop, day, n }]
 *   GET    /community/:id                                        → SharedTimeline | 404
 *   PUT    /community/me     (X-Community-Key: device key)       → { id, key }
 *          (no key on the first share: the server issues one, which the app keeps)
 *   DELETE /community/me     (X-Community-Key: device key)       → 204
 *   POST   /community/:id/report { reason }                      → 204
 *          (REPORT_HIDE_AT distinct reporters hide a timeline from every read)
 *
 * The shapes match mobile/src/features/community/communityApi.ts. STOPS and
 * STOP_OF are copied from mobile/src/features/community/model.ts; keep in sync.
 */

export const PROGRAMS = ['cec', 'fsw', 'fst', 'pnp_ee', 'pnp', 'aip', 'other'] as const;
export const STOPS = ['ita', 'aor', 'bio', 'medical', 'ppr', 'decision'] as const;
const STOP_OF: Record<string, (typeof STOPS)[number] | null> = {
  'ITA': 'ita', 'Application Submitted': 'ita', 'AOR Received': 'aor',
  'Biometrics Requested': 'bio', 'Biometrics Completed': 'bio',
  'Medical Requested': 'medical', 'Medical Passed': 'medical',
  'Passport Requested': 'ppr', 'Passport Submitted': 'ppr', 'Passport Collected': 'ppr',
  'Portal 1': 'decision', 'Portal 2': 'decision', 'Final Decision': 'decision',
  'ADR': null,
};
const SORTS = ['recent', 'longest', 'furthest'] as const;
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const KEY_RE = /^[A-Za-z0-9_-]{32,128}$/;
const MAX_STEPS = 40;
const MAX_DAY = 3650;
const MAX_ALIAS = 30;
const MAX_LIMIT = 50;
const DAY_MS = 86_400_000;
const AVATAR_RE = /^[a-z0-9]{1,16}$/;
export const REPORT_REASONS = ['spam', 'offensive', 'misleading', 'other'] as const;
export const REPORT_HIDE_AT = 3;

export type NewTimeline = { id: string; owner: string; aorMonth: string };

// Display-name filter. Names are lowercased, with accents and look-alike digits
// folded ("fück", "b1tch"). STEMS match anywhere, after dropping spaces and
// punctuation ("F.u_c k"); WORDS only as a whole word, because they hide inside
// real names (Kshitij, Dominique, Nazir, grape).
const STEMS = [
  'fuck', 'cunt', 'nigg', 'fagg', 'retard', 'whore', 'bitch', 'slut', 'tranny', 'pussy', 'twat', 'bastard', 'hitler',
  'merde', 'putain', 'connard', 'connasse', 'salope', 'encule', 'tabarnak', 'calisse',
  // Impersonation: nobody here speaks for IRCC, the government or the app.
  'ircc', 'official', 'officiel', 'admin', 'moderator', 'moderateur', 'government', 'gouvernement', 'crspulse',
];
const WORDS = new Set(['shit', 'shitty', 'rape', 'rapist', 'nazi', 'nique', 'porn', 'wank', 'fuk', 'kike', 'chink', 'nigga', 'batard', 'pute']);
const LOOKALIKE: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '$': 's', '!': 'i' };

/** False for names with a slur, profanity, impersonation, or contact details (links, emails, @handles, phone numbers). */
export function aliasAllowed(alias: string): boolean {
  if (/https?:|www\.|\.(com|ca|net|org|io)\b|@|\d{6,}|(\d[\s.-]?){7,}/i.test(alias)) return false;
  const folded = alias.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[013457$!]/g, (ch) => LOOKALIKE[ch]!);
  const squashed = folded.replace(/[^a-z]/g, '');
  return !STEMS.some((stem) => squashed.includes(stem)) && !folded.split(/[^a-z]+/).some((w) => WORDS.has(w));
}

type Step = { type: string; day: number; month?: string };
export type Timeline = { alias: string; program: string; aorMonth?: string; avatar?: string; steps: Step[] };
type Row = {
  id: string; alias: string; program: string; aor_month: string | null;
  steps: string; stage: number; last_day: number; updated_at: number; avatar: string | null;
  by_admin?: number;
};

/** Checks a published timeline and keeps only the allowed fields. Returns an error string if it's invalid. */
export function cleanTimeline(body: unknown, now = new Date()): Timeline | string {
  if (!body || typeof body !== 'object') return 'body must be an object';
  const b = body as Record<string, unknown>;
  // Also drops invisible characters (zero-width, bidi overrides) that can disguise or reverse a name.
  const alias = typeof b.alias === 'string' ? b.alias.replace(/[\u0000-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/g, '').trim() : '';
  if (alias.length > MAX_ALIAS) return `alias is longer than ${MAX_ALIAS}`;
  if (alias && !aliasAllowed(alias)) return 'alias not allowed';
  if (b.avatar !== undefined && (typeof b.avatar !== 'string' || !AVATAR_RE.test(b.avatar))) return 'bad avatar';
  if (!PROGRAMS.includes(b.program as never)) return 'unknown program';
  if (b.aorMonth !== undefined && (typeof b.aorMonth !== 'string' || !MONTH_RE.test(b.aorMonth)
    || b.aorMonth > now.toISOString().slice(0, 7))) return 'bad aorMonth';
  if (!Array.isArray(b.steps) || b.steps.length === 0 || b.steps.length > MAX_STEPS) return 'steps must hold 1-40 items';
  const steps: Step[] = [];
  let prev = 0;
  for (const raw of b.steps as unknown[]) {
    const s = (raw ?? {}) as Record<string, unknown>;
    if (typeof s.type !== 'string' || !(s.type in STOP_OF)) return 'unknown step type';
    if (!Number.isInteger(s.day) || (s.day as number) < prev || (s.day as number) > MAX_DAY) return 'bad step day';
    if (s.month !== undefined && (typeof s.month !== 'string' || !MONTH_RE.test(s.month))) return 'bad step month';
    prev = s.day as number;
    steps.push(s.month === undefined ? { type: s.type, day: prev } : { type: s.type, day: prev, month: s.month as string });
  }
  if (steps[0]!.day !== 0) return 'first step must be day 0';
  const t: Timeline = { alias, program: b.program as string, steps };
  if (b.aorMonth !== undefined) t.aorMonth = b.aorMonth as string;
  if (b.avatar !== undefined) t.avatar = b.avatar as string;
  return t;
}

export const stageOf = (steps: Step[]): number =>
  steps.reduce((max, s) => { const stop = STOP_OF[s.type]; return stop ? Math.max(max, STOPS.indexOf(stop)) : max; }, -1);

/** Median first day each stop was reached, over the timelines that reached it (as model.ts typicalPace). */
export function typicalPace(all: Step[][]): { stop: string; day: number; n: number }[] {
  return STOPS.slice(1).flatMap((stop) => {
    const days = all
      .map((steps) => steps.find((s) => STOP_OF[s.type] === stop)?.day)
      .filter((d): d is number => d !== undefined)
      .sort((a, b) => a - b);
    if (days.length === 0) return [];
    const mid = Math.floor(days.length / 2);
    const median = days.length % 2 ? days[mid]! : Math.round((days[mid - 1]! + days[mid]!) / 2);
    return [{ stop, day: median, n: days.length }];
  });
}

const toTimeline = (r: Row, now: number) => {
  const t: Record<string, unknown> = {
    id: r.id, alias: r.alias, program: r.program,
    steps: JSON.parse(r.steps) as Step[],
    updatedDaysAgo: Math.max(0, Math.floor((now - r.updated_at) / DAY_MS)),
  };
  if (r.aor_month) t.aorMonth = r.aor_month;
  if (r.avatar) t.avatar = r.avatar;
  if (r.by_admin) t.byAdmin = true;
  return t;
};

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, '0')).join('');
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

/** One page of the feed. `recent` pages by keyset on (updated_at, id); the others by offset. */
export async function listPage(db: D1Database, q: URLSearchParams, now = Date.now()) {
  const program = q.get('program');
  const aor = q.get('aor');
  const stage = q.get('stage');
  const sort = (SORTS as readonly string[]).includes(q.get('sort') ?? '') ? q.get('sort')! : 'recent';
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(q.get('limit')) || 20));
  const cursor = q.get('cursor');

  const where: string[] = ['hidden = 0'];
  const args: unknown[] = [];
  if (program && program !== 'all') { where.push('program = ?'); args.push(program); }
  if (aor) { where.push('aor_month = ?'); args.push(aor); }
  if (stage) { where.push('stage = ?'); args.push(STOPS.indexOf(stage as never)); }

  let offset = 0;
  if (sort === 'recent' && cursor) {
    const [at, id] = [cursor.slice(0, cursor.indexOf(':')), cursor.slice(cursor.indexOf(':') + 1)];
    where.push('(updated_at < ? OR (updated_at = ? AND id > ?))');
    args.push(Number(at), Number(at), id);
  } else if (cursor) {
    // shortcut: offset paging for longest/furthest can skip or repeat a row that changes mid-scroll; keyset them if that shows.
    offset = Math.max(0, Number(cursor) || 0);
  }
  const order = { recent: 'updated_at DESC, id', longest: 'last_day DESC, id', furthest: 'stage DESC, last_day ASC, id' }[sort];
  const sql = `SELECT * FROM community_timelines WHERE ${where.join(' AND ')}
    ORDER BY ${order} LIMIT ? OFFSET ?`;
  const { results } = await db.prepare(sql).bind(...args, limit + 1, offset).all<Row>();
  const rows = results.slice(0, limit);
  const more = results.length > limit;
  const last = rows[rows.length - 1];
  const nextCursor = !more || !last ? null : sort === 'recent' ? `${last.updated_at}:${last.id}` : String(offset + limit);
  return { items: rows.map((r) => toTimeline(r, now)), nextCursor };
}

/** Handles /community routes; returns null for any other path. */
export async function handleCommunity(
  request: Request,
  url: URL,
  db: D1Database | undefined,
  authorized: boolean,
  rateLimited: (owner: string) => Promise<boolean>,
  /** Called on each new report, e.g. to email ops; must not throw. */
  onReport: (id: string, alias: string, reason: string, reports: number) => Promise<void> = async () => {},
  /** Called once when a device first shares a timeline with an AOR month; must not throw. */
  onNewTimeline: (t: NewTimeline) => void = () => {},
): Promise<Response | null> {
  if (url.pathname !== '/community' && !url.pathname.startsWith('/community/')) return null;
  if (!db) return json({ message: 'Service unavailable' }, 503);
  if (!authorized) return json({ message: 'Unauthorized' }, 401);
  const sub = url.pathname.slice('/community/'.length);

  if (url.pathname === '/community' && request.method === 'GET') {
    return json(await listPage(db, url.searchParams));
  }

  if (sub === 'summary' && request.method === 'GET') {
    const program = url.searchParams.get('program');
    if (!PROGRAMS.includes(program as never)) return json({ message: 'unknown program' }, 422);
    // shortcut: reads every row of the program on each call; cache it (Cache API or a summary table) past ~50k rows.
    const { results } = await db.prepare('SELECT steps FROM community_timelines WHERE program = ? AND hidden = 0')
      .bind(program).all<{ steps: string }>();
    return json(typicalPace(results.map((r) => JSON.parse(r.steps) as Step[])));
  }

  if (sub === 'me' && (request.method === 'PUT' || request.method === 'DELETE')) {
    const sent = request.headers.get('X-Community-Key');
    // The app has no secure random source without a native module, so the server mints the key.
    const key = sent ?? (request.method === 'PUT' ? `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, '') : '');
    if (!KEY_RE.test(key)) return json({ message: 'X-Community-Key is required' }, 422);
    const owner = await sha256(key);
    if (await rateLimited(owner)) return json({ message: 'Too many requests' }, 429);

    if (request.method === 'DELETE') {
      await db.batch([
        // Reports go with the timeline, so nothing about it is kept after it's unshared.
        db.prepare('DELETE FROM community_reports WHERE timeline_id IN (SELECT id FROM community_timelines WHERE owner = ?)').bind(owner),
        db.prepare('DELETE FROM community_timelines WHERE owner = ?').bind(owner),
      ]);
      return new Response(null, { status: 204 });
    }

    let body: unknown;
    try { body = await request.json(); } catch { return json({ message: 'Invalid JSON body' }, 400); }
    const t = cleanTimeline(body);
    if (typeof t === 'string') return json({ message: t }, 422);
    const newId = crypto.randomUUID();
    const row = await db.prepare(
      `INSERT INTO community_timelines (id, owner, alias, program, aor_month, steps, stage, last_day, updated_at, avatar)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(owner) DO UPDATE SET alias = excluded.alias, program = excluded.program, avatar = excluded.avatar,
         aor_month = excluded.aor_month, steps = excluded.steps, stage = excluded.stage,
         last_day = excluded.last_day,
         -- Re-sending the same timeline (the app syncs on launch) doesn't count as an update.
         updated_at = CASE WHEN community_timelines.steps IS excluded.steps AND community_timelines.alias IS excluded.alias
           AND community_timelines.program IS excluded.program AND community_timelines.aor_month IS excluded.aor_month
           THEN community_timelines.updated_at ELSE excluded.updated_at END
       RETURNING id`,
    ).bind(
      newId, owner, t.alias, t.program, t.aorMonth ?? null, JSON.stringify(t.steps),
      stageOf(t.steps), t.steps[t.steps.length - 1]!.day, Date.now(), t.avatar ?? null,
    ).first<{ id: string }>();
    // An update keeps the row's old id, so a match means this was a first share.
    if (row!.id === newId && t.aorMonth) onNewTimeline({ id: newId, owner, aorMonth: t.aorMonth });
    return json({ id: row!.id, key });
  }

  const report = /^([^/]+)\/report$/.exec(sub);
  if (report && request.method === 'POST') {
    const id = report[1]!;
    let body: { reason?: unknown };
    try { body = (await request.json()) as { reason?: unknown }; } catch { return json({ message: 'Invalid JSON body' }, 400); }
    if (!REPORT_REASONS.includes(body.reason as never)) return json({ message: 'unknown reason' }, 422);
    const key = request.headers.get('X-Community-Key');
    // One vote per device; a device that never shared counts once per IP.
    const reporter = await sha256(key && KEY_RE.test(key) ? key : `ip:${request.headers.get('CF-Connecting-IP') ?? ''}`);
    if (await rateLimited(reporter)) return json({ message: 'Too many requests' }, 429);
    const target = await db.prepare('SELECT alias FROM community_timelines WHERE id = ?').bind(id).first<{ alias: string }>();
    if (!target) return json({ message: 'Not found' }, 404);
    const added = await db.prepare(
      'INSERT OR IGNORE INTO community_reports (timeline_id, reporter, reason, created_at) VALUES (?, ?, ?, ?)',
    ).bind(id, reporter, body.reason, Date.now()).run();
    if (added.meta.changes) {
      const { n } = (await db.prepare('SELECT COUNT(*) AS n FROM community_reports WHERE timeline_id = ?').bind(id).first<{ n: number }>())!;
      if (n >= REPORT_HIDE_AT) await db.prepare('UPDATE community_timelines SET hidden = 1 WHERE id = ?').bind(id).run();
      await onReport(id, target.alias, body.reason as string, n);
    }
    return new Response(null, { status: 204 });
  }

  if (sub && !sub.includes('/') && sub !== 'me' && sub !== 'summary' && request.method === 'GET') {
    const row = await db.prepare('SELECT * FROM community_timelines WHERE id = ? AND hidden = 0').bind(sub).first<Row>();
    return row ? json(toTimeline(row, Date.now())) : json({ message: 'Not found' }, 404);
  }

  return json({ message: 'Not found' }, 404);
}

/**
 * Ops CRUD for the dashboard (admin.crspulse.com), behind SYNC_SECRET (never in the app):
 *
 *   GET    /admin/community?q=&status=all|visible|hidden|reported&offset=&limit=(1-100, default 50)  → { items, total }
 *   GET    /admin/community/stats      counts for the dashboard's Community overview
 *   POST   /admin/community            { alias, avatar?, program, aorMonth?, steps }   → item
 *   PATCH  /admin/community/:id        any of those fields (null clears avatar/aorMonth), hidden → item
 *   DELETE /admin/community/:id        the timeline and its reports
 *   GET    /admin/community/:id/reports                                   → [{ reason, createdAt }]
 *   DELETE /admin/community/:id/reports  dismiss its reports (doesn't un-hide)
 *
 * Unlike the app's routes this returns hidden rows, report counts and timestamps.
 */
const ADMIN_PAGE = 50;

// Admin timelines always get a display name: "Anonymous" is left to people sharing from the app.
const NAME_ADJ = ['Calm', 'Bright', 'Brave', 'Patient', 'Hopeful', 'Sunny', 'Quiet', 'Steady', 'Kind', 'Lucky', 'Gentle', 'Bold', 'Cheerful', 'Swift', 'Clever', 'Happy'];
const NAME_NOUN = ['Maple', 'Moose', 'Loon', 'Beaver', 'Otter', 'Pine', 'Lynx', 'Heron', 'Aurora', 'Cedar', 'Falcon', 'River', 'Birch', 'Puffin', 'Caribou', 'Lake'];
const pick = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)]!;
const digit = (n: number) => String(Math.floor(Math.random() * n));

/** A handle like "CalmMaple4821" (passes the name filter) and a buddy avatar id (see mobile BuddyAvatar). */
export function randomIdentity(): { alias: string; avatar: string } {
  let alias: string;
  do alias = `${pick(NAME_ADJ)}${pick(NAME_NOUN)}${1000 + Math.floor(Math.random() * 9000)}`;
  while (!aliasAllowed(alias));
  // b + colour(10) eyes(8) mouth(6) hat(10) extra(4)
  return { alias, avatar: `b${digit(10)}${digit(8)}${digit(6)}${digit(10)}${digit(4)}` };
}
type AdminRow = Row & { hidden: number; reports: number };

const toAdmin = (r: AdminRow) => ({
  id: r.id, alias: r.alias, avatar: r.avatar, program: r.program, aorMonth: r.aor_month,
  steps: JSON.parse(r.steps) as Step[], stage: r.stage, lastDay: r.last_day,
  updatedAt: r.updated_at, hidden: !!r.hidden, reports: r.reports, byAdmin: !!r.by_admin,
});

const ADMIN_SELECT = `SELECT t.*, (SELECT COUNT(*) FROM community_reports r WHERE r.timeline_id = t.id) AS reports
  FROM community_timelines t`;

async function adminGet(db: D1Database, id: string) {
  const row = await db.prepare(`${ADMIN_SELECT} WHERE t.id = ?`).bind(id).first<AdminRow>();
  return row ? toAdmin(row) : null;
}

export async function handleCommunityAdmin(
  request: Request,
  url: URL,
  db: D1Database | undefined,
  authorized: boolean,
  onNewTimeline: (t: NewTimeline) => void = () => {},
): Promise<Response | null> {
  if (url.pathname !== '/admin/community' && !url.pathname.startsWith('/admin/community/')) return null;
  if (!authorized) return json({ message: 'Unauthorized' }, 401);
  if (!db) return json({ message: 'Service unavailable' }, 503);
  const [id, sub, extra] = url.pathname.slice('/admin/community/'.length).split('/');
  const m = request.method;

  if (id === 'stats' && sub === undefined && m === 'GET') return json(await adminStats(db));
  if (id === 'random' && sub === undefined && m === 'GET') return json(randomIdentity());

  if (!id && m === 'GET') {
    const q = (url.searchParams.get('q') ?? '').trim();
    const status = url.searchParams.get('status') ?? 'all';
    const offset = Math.max(0, Number(url.searchParams.get('offset')) || 0);
    const limit = Math.min(100, Math.max(1, Math.floor(Number(url.searchParams.get('limit'))) || ADMIN_PAGE));
    const where: string[] = [];
    const args: unknown[] = [];
    if (q) { where.push('(t.alias LIKE ? OR t.id = ?)'); args.push(`%${q}%`, q); }
    if (status === 'visible') where.push('t.hidden = 0');
    if (status === 'hidden') where.push('t.hidden = 1');
    if (status === 'reported') where.push('EXISTS (SELECT 1 FROM community_reports r WHERE r.timeline_id = t.id)');
    // The app's feed filters (program, AOR month, stage, sort); unknown values are ignored.
    const program = url.searchParams.get('program');
    const aor = url.searchParams.get('aor') ?? '';
    const stage = STOPS.indexOf(url.searchParams.get('stage') as never);
    if (PROGRAMS.includes(program as never)) { where.push('t.program = ?'); args.push(program); }
    if (aor === 'none') where.push('t.aor_month IS NULL');
    else if (MONTH_RE.test(aor)) { where.push('t.aor_month = ?'); args.push(aor); }
    if (stage >= 0) { where.push('t.stage = ?'); args.push(stage); }
    const sort = url.searchParams.get('sort');
    const order = sort === 'longest' ? 't.last_day DESC, t.id' : sort === 'furthest' ? 't.stage DESC, t.last_day ASC, t.id' : 't.updated_at DESC, t.id';
    const w = where.length ? ` WHERE ${where.join(' AND ')}` : '';
    const [{ results }, total, months] = await Promise.all([
      db.prepare(`${ADMIN_SELECT}${w} ORDER BY ${order} LIMIT ? OFFSET ?`).bind(...args, limit, offset).all<AdminRow>(),
      db.prepare(`SELECT COUNT(*) AS n FROM community_timelines t${w}`).bind(...args).first<{ n: number }>(),
      // For the AOR month filter's options.
      db.prepare('SELECT DISTINCT aor_month AS m FROM community_timelines WHERE aor_month IS NOT NULL ORDER BY aor_month DESC').all<{ m: string }>(),
    ]);
    return json({ items: results.map(toAdmin), total: total?.n ?? 0, offset, pageSize: limit, aorMonths: months.results.map((r) => r.m) });
  }

  if (!id && m === 'POST') {
    let body: unknown;
    try { body = await request.json(); } catch { return json({ message: 'Invalid JSON body' }, 400); }
    const t = cleanTimeline(body);
    if (typeof t === 'string') return json({ message: t }, 422);
    const made = randomIdentity();
    t.alias ||= made.alias;
    t.avatar ??= made.avatar;
    const newId = crypto.randomUUID();
    // No device holds this row's key, so only the dashboard can change or delete it.
    const owner = await sha256(`admin:${crypto.randomUUID()}`);
    await db.prepare(
      `INSERT INTO community_timelines (id, owner, alias, program, aor_month, steps, stage, last_day, updated_at, avatar, by_admin)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    ).bind(newId, owner, t.alias, t.program, t.aorMonth ?? null, JSON.stringify(t.steps), stageOf(t.steps),
      t.steps[t.steps.length - 1]!.day, Date.now(), t.avatar ?? null).run();
    if (t.aorMonth) onNewTimeline({ id: newId, owner, aorMonth: t.aorMonth });
    return json(await adminGet(db, newId), 201);
  }

  if (!id || extra !== undefined) return json({ message: 'Not found' }, 404);
  const current = await adminGet(db, id);
  if (!current) return json({ message: 'Not found' }, 404);

  if (sub === 'reports') {
    if (m === 'GET') {
      const { results } = await db.prepare(
        'SELECT reason, created_at FROM community_reports WHERE timeline_id = ? ORDER BY created_at DESC',
      ).bind(id).all<{ reason: string; created_at: number }>();
      return json(results.map((r) => ({ reason: r.reason, createdAt: r.created_at })));
    }
    if (m === 'DELETE') {
      await db.prepare('DELETE FROM community_reports WHERE timeline_id = ?').bind(id).run();
      return new Response(null, { status: 204 });
    }
    return json({ message: 'Not found' }, 404);
  }
  if (sub !== undefined) return json({ message: 'Not found' }, 404);

  if (m === 'DELETE') {
    await db.batch([
      db.prepare('DELETE FROM community_reports WHERE timeline_id = ?').bind(id),
      db.prepare('DELETE FROM community_timelines WHERE id = ?').bind(id),
    ]);
    return new Response(null, { status: 204 });
  }

  if (m === 'PATCH') {
    let patch: Record<string, unknown>;
    try { patch = (await request.json()) as Record<string, unknown>; } catch { return json({ message: 'Invalid JSON body' }, 400); }
    if (!patch || typeof patch !== 'object') return json({ message: 'body must be an object' }, 400);
    if (patch.hidden !== undefined && typeof patch.hidden !== 'boolean') return json({ message: 'hidden must be true or false' }, 422);
    // Merge, then run the same checks as a share (null clears an optional field).
    const merged: Record<string, unknown> = {
      alias: patch.alias ?? current.alias, program: patch.program ?? current.program, steps: patch.steps ?? current.steps,
    };
    const avatar = patch.avatar === undefined ? current.avatar : patch.avatar;
    const aorMonth = patch.aorMonth === undefined ? current.aorMonth : patch.aorMonth;
    if (avatar !== null && avatar !== '') merged.avatar = avatar;
    if (aorMonth !== null && aorMonth !== '') merged.aorMonth = aorMonth;
    const t = cleanTimeline(merged);
    if (typeof t === 'string') return json({ message: t }, 422);
    if (current.byAdmin && !t.alias) t.alias = randomIdentity().alias;
    const hidden = patch.hidden === undefined ? current.hidden : patch.hidden;
    // An ops edit isn't the owner's update, so updated_at (feed order) stays as it was.
    await db.prepare(
      `UPDATE community_timelines SET alias = ?, program = ?, aor_month = ?, steps = ?, stage = ?, last_day = ?, avatar = ?, hidden = ?
       WHERE id = ?`,
    ).bind(t.alias, t.program, t.aorMonth ?? null, JSON.stringify(t.steps), stageOf(t.steps),
      t.steps[t.steps.length - 1]!.day, t.avatar ?? null, hidden ? 1 : 0, id).run();
    return json(await adminGet(db, id));
  }

  return json({ message: 'Not found' }, 404);
}

const WEEK_MS = 7 * DAY_MS;

/** Counts for the dashboard: totals, activity, breakdowns, and the most-reported timelines. */
export async function adminStats(db: D1Database, now = Date.now()) {
  const since = now - WEEK_MS;
  const [totals, reports7, programs, stages, reasons, review] = await Promise.all([
    db.prepare(`SELECT COUNT(*) AS total, COALESCE(SUM(hidden), 0) AS hidden,
        COALESCE(SUM(CASE WHEN updated_at >= ? THEN 1 ELSE 0 END), 0) AS active7,
        COALESCE(SUM(CASE WHEN EXISTS (SELECT 1 FROM community_reports r WHERE r.timeline_id = t.id) THEN 1 ELSE 0 END), 0) AS reported,
        (SELECT COUNT(*) FROM community_reports) AS reportsTotal
      FROM community_timelines t`).bind(since).first<Record<string, number>>(),
    db.prepare('SELECT COUNT(*) AS n FROM community_reports WHERE created_at >= ?').bind(since).first<{ n: number }>(),
    db.prepare('SELECT program AS k, COUNT(*) AS n FROM community_timelines GROUP BY program ORDER BY n DESC').bind().all<{ k: string; n: number }>(),
    db.prepare('SELECT stage AS k, COUNT(*) AS n FROM community_timelines GROUP BY stage ORDER BY stage').bind().all<{ k: number; n: number }>(),
    db.prepare('SELECT reason AS k, COUNT(*) AS n FROM community_reports GROUP BY reason ORDER BY n DESC').bind().all<{ k: string; n: number }>(),
    db.prepare(`${ADMIN_SELECT} WHERE EXISTS (SELECT 1 FROM community_reports r WHERE r.timeline_id = t.id)
      ORDER BY reports DESC, t.updated_at DESC LIMIT 5`).bind().all<AdminRow>(),
  ]);
  const t = totals ?? {};
  return {
    total: t.total ?? 0, hidden: t.hidden ?? 0, visible: (t.total ?? 0) - (t.hidden ?? 0),
    active7: t.active7 ?? 0, reported: t.reported ?? 0, reportsTotal: t.reportsTotal ?? 0, reports7: reports7?.n ?? 0,
    byProgram: programs.results.map((r) => ({ key: r.k, n: r.n })),
    byStage: stages.results.map((r) => ({ key: STOPS[r.k] ?? 'none', n: r.n })),
    byReason: reasons.results.map((r) => ({ key: r.k, n: r.n })),
    review: review.results.map(toAdmin),
  };
}
