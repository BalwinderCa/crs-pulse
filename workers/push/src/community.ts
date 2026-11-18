/**
 * Community timelines (D1 binding COMMUNITY_DB). Routes, all behind the app's
 * PUSH_API_SECRET bearer:
 *
 *   GET    /community?program=&aor=&stage=&sort=&cursor=&limit=  → { items, nextCursor }
 *   GET    /community/summary?program=cec                        → [{ stop, day, n }]
 *   GET    /community/:id                                        → SharedTimeline | 404
 *   PUT    /community/me     (X-Community-Key: device key)       → { id }
 *   DELETE /community/me     (X-Community-Key: device key)       → 204
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

type Step = { type: string; day: number; month?: string };
export type Timeline = { alias: string; program: string; aorMonth?: string; steps: Step[] };
type Row = {
  id: string; alias: string; program: string; aor_month: string | null;
  steps: string; stage: number; last_day: number; updated_at: number;
};

/** Checks a published timeline and keeps only the allowed fields. Returns an error string if it's invalid. */
export function cleanTimeline(body: unknown): Timeline | string {
  if (!body || typeof body !== 'object') return 'body must be an object';
  const b = body as Record<string, unknown>;
  const alias = typeof b.alias === 'string' ? b.alias.replace(/[\u0000-\u001f\u007f]/g, '').trim() : '';
  if (alias.length > MAX_ALIAS) return `alias is longer than ${MAX_ALIAS}`;
  if (!PROGRAMS.includes(b.program as never)) return 'unknown program';
  if (b.aorMonth !== undefined && (typeof b.aorMonth !== 'string' || !MONTH_RE.test(b.aorMonth))) return 'bad aorMonth';
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

  const where: string[] = [];
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
  const sql = `SELECT * FROM community_timelines ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
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
    const { results } = await db.prepare('SELECT steps FROM community_timelines WHERE program = ?')
      .bind(program).all<{ steps: string }>();
    return json(typicalPace(results.map((r) => JSON.parse(r.steps) as Step[])));
  }

  if (sub === 'me' && (request.method === 'PUT' || request.method === 'DELETE')) {
    const key = request.headers.get('X-Community-Key') ?? '';
    if (!KEY_RE.test(key)) return json({ message: 'X-Community-Key is required' }, 422);
    const owner = await sha256(key);
    if (await rateLimited(owner)) return json({ message: 'Too many requests' }, 429);

    if (request.method === 'DELETE') {
      await db.prepare('DELETE FROM community_timelines WHERE owner = ?').bind(owner).run();
      return new Response(null, { status: 204 });
    }

    let body: unknown;
    try { body = await request.json(); } catch { return json({ message: 'Invalid JSON body' }, 400); }
    const t = cleanTimeline(body);
    if (typeof t === 'string') return json({ message: t }, 422);
    const row = await db.prepare(
      `INSERT INTO community_timelines (id, owner, alias, program, aor_month, steps, stage, last_day, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(owner) DO UPDATE SET alias = excluded.alias, program = excluded.program,
         aor_month = excluded.aor_month, steps = excluded.steps, stage = excluded.stage,
         last_day = excluded.last_day, updated_at = excluded.updated_at
       RETURNING id`,
    ).bind(
      crypto.randomUUID(), owner, t.alias, t.program, t.aorMonth ?? null, JSON.stringify(t.steps),
      stageOf(t.steps), t.steps[t.steps.length - 1]!.day, Date.now(),
    ).first<{ id: string }>();
    return json({ id: row!.id });
  }

  if (sub && sub !== 'me' && sub !== 'summary' && request.method === 'GET') {
    const row = await db.prepare('SELECT * FROM community_timelines WHERE id = ?').bind(sub).first<Row>();
    return row ? json(toTimeline(row, Date.now())) : json({ message: 'Not found' }, 404);
  }

  return json({ message: 'Not found' }, 404);
}
