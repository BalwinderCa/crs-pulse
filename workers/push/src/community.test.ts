import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { REPORT_HIDE_AT, aliasAllowed, cleanTimeline, handleCommunity, handleCommunityAdmin, randomIdentity } from './community.ts';

/** Just enough of D1 over node:sqlite, with the real migration applied. */
function makeDb() {
  const db = new DatabaseSync(':memory:');
  for (const f of ['0001_community.sql', '0002_community_moderation.sql', '0003_community_by_admin.sql']) {
    db.exec(readFileSync(new URL(`../migrations/${f}`, import.meta.url), 'utf8'));
  }
  const prepare = (sql: string) => {
    let args: unknown[] = [];
    const stmt = {
      bind: (...a: unknown[]) => { args = a; return stmt; },
      all: async () => ({ results: db.prepare(sql).all(...(args as never[])) }),
      first: async () => db.prepare(sql).get(...(args as never[])) ?? null,
      run: async () => ({ meta: { changes: Number(db.prepare(sql).run(...(args as never[])).changes) } }),
    };
    return stmt;
  };
  const batch = async (stmts: { run: () => Promise<unknown> }[]) => { for (const st of stmts) await st.run(); };
  return { prepare, batch } as unknown as D1Database;
}

const KEY_A = 'a'.repeat(40);
const KEY_B = 'b'.repeat(40);
const timeline = (over: Record<string, unknown> = {}) => ({
  alias: 'Maple', program: 'cec', aorMonth: '2026-05',
  steps: [{ type: 'ITA', day: 0 }, { type: 'AOR Received', day: 30 }, { type: 'Passport Requested', day: 150 }],
  ...over,
});

async function call(db: D1Database, method: string, path: string,
  opts: { key?: string; body?: unknown; auth?: boolean; ip?: string; onReport?: () => Promise<void> } = {}) {
  const headers: Record<string, string> = {};
  if (opts.key) headers['X-Community-Key'] = opts.key;
  if (opts.ip) headers['CF-Connecting-IP'] = opts.ip;
  const req = new Request(`https://w.dev${path}`, {
    method, headers, ...(opts.body ? { body: JSON.stringify(opts.body) } : {}),
  });
  const res = await handleCommunity(req, new URL(req.url), db, opts.auth ?? true, async () => false, opts.onReport);
  return { status: res!.status, body: res!.status === 204 ? null : await res!.json() as any };
}

test('cleanTimeline strips invisible characters and refuses a future AOR month', () => {
  const base = { program: 'cec', steps: [{ type: 'ITA', day: 0 }] };
  const t = cleanTimeline({ ...base, alias: 'abc\u202Eevil\u200B' }) as { alias: string };
  assert.equal(t.alias, 'abcevil');
  assert.equal(cleanTimeline({ ...base, alias: 'I\u200BRCC' }), 'alias not allowed');
  const now = new Date('2026-11-18T12:00:00Z');
  assert.equal(cleanTimeline({ ...base, aorMonth: '2026-12' }, now), 'bad aorMonth');
  assert.equal(typeof cleanTimeline({ ...base, aorMonth: '2026-11' }, now), 'object');
});

test('publish, read back, update in place, delete', async () => {
  const db = makeDb();
  const put = await call(db, 'PUT', '/community/me', { key: KEY_A, body: timeline() });
  assert.equal(put.status, 200);
  const id = put.body.id;

  const one = await call(db, 'GET', `/community/${id}`);
  assert.deepEqual(one.body, { ...timeline(), id, updatedDaysAgo: 0 });

  // Same device publishes again: same id, new content.
  const again = await call(db, 'PUT', '/community/me', { key: KEY_A, body: timeline({ alias: 'Leaf' }) });
  assert.equal(again.body.id, id);
  assert.equal((await call(db, 'GET', '/community')).body.items.length, 1);

  assert.equal((await call(db, 'DELETE', '/community/me', { key: KEY_A })).status, 204);
  assert.equal((await call(db, 'GET', `/community/${id}`)).status, 404);
});

test('first share without a key gets one; reusing it updates the same row', async () => {
  const db = makeDb();
  const first = await call(db, 'PUT', '/community/me', { body: timeline() });
  assert.match(first.body.key, /^[0-9a-f]{64}$/);
  const again = await call(db, 'PUT', '/community/me', { key: first.body.key, body: timeline({ alias: 'Leaf' }) });
  assert.equal(again.body.id, first.body.id);
  assert.equal((await call(db, 'GET', '/community')).body.items.length, 1);
});

test('pages through every row exactly once, newest first', async () => {
  const db = makeDb();
  for (let i = 0; i < 7; i++) await call(db, 'PUT', '/community/me', { key: `${i}`.repeat(32), body: timeline() });
  const seen: string[] = [];
  let cursor: string | null = null;
  do {
    const r: any = await call(db, 'GET', `/community?limit=3${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`);
    seen.push(...r.body.items.map((t: any) => t.id));
    cursor = r.body.nextCursor;
  } while (cursor);
  assert.equal(seen.length, 7);
  assert.equal(new Set(seen).size, 7);
});

test('filters by program, AOR month and stage; summary is per program', async () => {
  const db = makeDb();
  await call(db, 'PUT', '/community/me', { key: KEY_A, body: timeline() });
  await call(db, 'PUT', '/community/me', { key: KEY_B, body: timeline({ program: 'fsw', aorMonth: '2026-06' }) });
  const cec = await call(db, 'GET', '/community?program=cec&aor=2026-05&stage=ppr');
  assert.deepEqual(cec.body.items.map((t: any) => t.program), ['cec']);
  assert.equal((await call(db, 'GET', '/community?stage=decision')).body.items.length, 0);

  const summary = await call(db, 'GET', '/community/summary?program=fsw');
  assert.deepEqual(summary.body, [{ stop: 'aor', day: 30, n: 1 }, { stop: 'ppr', day: 150, n: 1 }]);
});

test('rejects anything outside the shared shape', () => {
  assert.equal(typeof cleanTimeline(timeline({ program: 'xyz' })), 'string');
  assert.equal(typeof cleanTimeline(timeline({ aorMonth: '2026-05-14' })), 'string');
  assert.equal(typeof cleanTimeline(timeline({ steps: [{ type: 'Custom', day: 0 }] })), 'string');
  assert.equal(typeof cleanTimeline(timeline({ steps: [{ type: 'ITA', day: 5 }] })), 'string');
  assert.equal(typeof cleanTimeline(timeline({ steps: [{ type: 'ITA', day: 0 }, { type: 'ADR', day: -1 }] })), 'string');
  assert.equal(typeof cleanTimeline(timeline({ alias: 'x'.repeat(31) })), 'string');
  // Extra fields (a note, an exact date) are dropped, not stored.
  const t = cleanTimeline(timeline({ note: 'secret', steps: [{ type: 'ITA', day: 0, date: '2026-01-02', note: 'x' }] }));
  assert.deepEqual(t, { alias: 'Maple', program: 'cec', aorMonth: '2026-05', steps: [{ type: 'ITA', day: 0 }] });
});

test('needs auth, a device key, and a bound database', async () => {
  const db = makeDb();
  assert.equal((await call(db, 'GET', '/community', { auth: false })).status, 401);
  assert.equal((await call(db, 'DELETE', '/community/me')).status, 422);
  assert.equal((await call(db, 'PUT', '/community/me', { key: 'short', body: timeline() })).status, 422);
  const req = new Request('https://w.dev/community');
  assert.equal((await handleCommunity(req, new URL(req.url), undefined, true, async () => false))!.status, 503);
});

test('name filter blocks slurs, profanity, impersonation and contact details, not real names', () => {
  for (const bad of ['F.u_c k', 'fück this', 'B1tch', 'IRCC Officer', 'Official helper', 'shit happens', 'me@mail.com',
    'www.spam.ca', 'call 416 555 0199', 'Putain', 'crs pulse team']) {
    assert.equal(aliasAllowed(bad), false, bad);
  }
  for (const ok of ['Kshitij', 'Dominique', 'Nazir', 'Grape Farmer', 'Scott from Essex', 'MapleBound', 'Priya 2026', 'Hancock']) {
    assert.equal(aliasAllowed(ok), true, ok);
  }
  assert.equal(cleanTimeline(timeline({ alias: 'IRCC Officer' })), 'alias not allowed');
});

test('avatar round-trips, and must be a short id', async () => {
  const db = makeDb();
  const put = await call(db, 'PUT', '/community/me', { key: KEY_A, body: timeline({ avatar: 'b3201' }) });
  assert.equal((await call(db, 'GET', `/community/${put.body.id}`)).body.avatar, 'b3201');
  assert.equal(typeof cleanTimeline(timeline({ avatar: '<svg>' })), 'string');
});

test('reports count once per reporter and hide the timeline at the threshold', async () => {
  const db = makeDb();
  const { body: { id } } = await call(db, 'PUT', '/community/me', { key: KEY_A, body: timeline() });
  const seen: number[] = [];
  const report = (ip: string, reason = 'spam') =>
    call(db, 'POST', `/community/${id}/report`, { ip, body: { reason }, onReport: async () => { seen.push(1); } });

  assert.equal((await report('1.1.1.1', 'nonsense')).status, 422);
  assert.equal((await report('1.1.1.1')).status, 204);
  assert.equal((await report('1.1.1.1')).status, 204); // same reporter: not counted again
  assert.equal(seen.length, 1);
  for (let i = 2; i <= REPORT_HIDE_AT; i++) await report(`1.1.1.${i}`);
  assert.equal(seen.length, REPORT_HIDE_AT);

  assert.equal((await call(db, 'GET', `/community/${id}`)).status, 404);
  assert.equal((await call(db, 'GET', '/community')).body.items.length, 0);
  assert.deepEqual((await call(db, 'GET', '/community/summary?program=cec')).body, []);
  // Re-sharing doesn't un-hide it.
  await call(db, 'PUT', '/community/me', { key: KEY_A, body: timeline({ alias: 'New name' }) });
  assert.equal((await call(db, 'GET', `/community/${id}`)).status, 404);
  assert.equal((await call(db, 'POST', '/community/nope/report', { body: { reason: 'spam' } })).status, 404);
  // Unsharing removes the reports with it.
  const reports = () => db.prepare('SELECT COUNT(*) AS n FROM community_reports').bind().first<{ n: number }>();
  assert.equal((await reports())!.n, REPORT_HIDE_AT);
  await call(db, 'DELETE', '/community/me', { key: KEY_A });
  assert.equal((await reports())!.n, 0);
});

async function admin(db: D1Database, method: string, path: string, body?: unknown, authorized = true) {
  const req = new Request(`https://w.dev${path}`, { method, ...(body ? { body: JSON.stringify(body) } : {}) });
  const res = await handleCommunityAdmin(req, new URL(req.url), db, authorized);
  return { status: res!.status, body: res!.status === 204 ? null : await res!.json() as any };
}

test('admin: list with hidden rows and report counts, filter, edit, dismiss, delete', async () => {
  const db = makeDb();
  assert.equal((await admin(db, 'GET', '/admin/community', undefined, false)).status, 401);

  const created = await admin(db, 'POST', '/admin/community', timeline({ alias: 'Seed', avatar: 'b1111' }));
  assert.equal(created.status, 201);
  const id = created.body.id;
  assert.equal(created.body.stage, 4);
  assert.equal(created.body.byAdmin, true);
  assert.equal((await call(db, 'GET', `/community/${id}`)).body.byAdmin, true);
  assert.equal((await admin(db, 'POST', '/admin/community', timeline({ alias: 'IRCC' }))).status, 422);

  await call(db, 'POST', `/community/${id}/report`, { ip: '1.1.1.1', body: { reason: 'spam' } });
  const list = await admin(db, 'GET', '/admin/community?status=reported');
  assert.equal(list.body.total, 1);
  assert.equal(list.body.items[0].reports, 1);
  assert.equal((await admin(db, 'GET', '/admin/community?q=nobody')).body.total, 0);
  assert.equal((await admin(db, 'GET', '/admin/community?q=See')).body.total, 1);

  // Hide, and it disappears from the app but not from the dashboard.
  const hid = await admin(db, 'PATCH', `/admin/community/${id}`, { hidden: true, alias: 'Renamed', avatar: null });
  assert.equal(hid.body.hidden, true);
  assert.equal(hid.body.alias, 'Renamed');
  assert.equal(hid.body.avatar, null);
  assert.equal((await call(db, 'GET', `/community/${id}`)).status, 404);
  assert.equal((await admin(db, 'GET', '/admin/community?status=hidden')).body.total, 1);
  assert.equal((await admin(db, 'PATCH', `/admin/community/${id}`, { steps: [{ type: 'ITA', day: 3 }] })).status, 422);

  assert.deepEqual((await admin(db, 'GET', `/admin/community/${id}/reports`)).body.map((r: any) => r.reason), ['spam']);
  assert.equal((await admin(db, 'DELETE', `/admin/community/${id}/reports`)).status, 204);
  assert.equal((await admin(db, 'GET', `/admin/community/${id}`)).status, 404); // no GET-one route; list is the view

  assert.equal((await admin(db, 'DELETE', `/admin/community/${id}`)).status, 204);
  assert.equal((await admin(db, 'GET', '/admin/community')).body.total, 0);
  assert.equal((await admin(db, 'PATCH', `/admin/community/${id}`, { hidden: false })).status, 404);
});

test('admin stats: totals, breakdowns and the most-reported first', async () => {
  const db = makeDb();
  const empty = await admin(db, 'GET', '/admin/community/stats');
  assert.equal(empty.body.total, 0);
  assert.deepEqual(empty.body.review, []);

  const a = (await admin(db, 'POST', '/admin/community', timeline({ alias: 'A' }))).body.id;
  await admin(db, 'POST', '/admin/community', timeline({ alias: 'B', program: 'fsw', steps: [{ type: 'ITA', day: 0 }] }));
  const c = (await admin(db, 'POST', '/admin/community', timeline({ alias: 'C' }))).body.id;
  await admin(db, 'PATCH', `/admin/community/${c}`, { hidden: true });
  for (const ip of ['1', '2']) await call(db, 'POST', `/community/${a}/report`, { ip, body: { reason: 'spam' } });
  await call(db, 'POST', `/community/${c}/report`, { ip: '1', body: { reason: 'offensive' } });

  const st = (await admin(db, 'GET', '/admin/community/stats')).body;
  assert.equal(st.total, 3);
  assert.equal(st.hidden, 1);
  assert.equal(st.visible, 2);
  assert.equal(st.active7, 3);
  assert.equal(st.reported, 2);
  assert.equal(st.reportsTotal, 3);
  assert.equal(st.reports7, 3);
  assert.deepEqual(st.byProgram, [{ key: 'cec', n: 2 }, { key: 'fsw', n: 1 }]);
  assert.deepEqual(st.byStage, [{ key: 'ita', n: 1 }, { key: 'ppr', n: 2 }]);
  assert.deepEqual(st.byReason, [{ key: 'spam', n: 2 }, { key: 'offensive', n: 1 }]);
  assert.deepEqual(st.review.map((r: any) => r.alias), ['A', 'C']);
});

test('admin timelines are never anonymous: a missing name and avatar are generated', async () => {
  for (let i = 0; i < 200; i++) {
    const { alias, avatar } = randomIdentity();
    assert.ok(aliasAllowed(alias) && alias.length <= 30, alias);
    assert.match(avatar, /^b\d[0-7][0-5]\d[0-3]$/);
  }
  const db = makeDb();
  const made = await admin(db, 'POST', '/admin/community', timeline({ alias: '' }));
  assert.equal(made.status, 201);
  assert.match(made.body.alias, /^[A-Z][a-z]+[A-Z][a-z]+\d{4}$/);
  assert.match(made.body.avatar, /^b\d{5}$/);
  const cleared = await admin(db, 'PATCH', `/admin/community/${made.body.id}`, { alias: '' });
  assert.ok(cleared.body.alias.length > 0);
  const random = await admin(db, 'GET', '/admin/community/random');
  assert.ok(random.body.alias && random.body.avatar);
});

test('app shares keep an empty name as Anonymous (only admin timelines get a generated one)', async () => {
  const db = makeDb();
  const req = new Request('https://w.dev/community/me', { method: 'PUT', body: JSON.stringify(timeline({ alias: '' })) });
  const res = await handleCommunity(req, new URL(req.url), db, true, async () => false);
  assert.equal(res!.status, 200);
  const row = await db.prepare('SELECT alias FROM community_timelines').first<{ alias: string }>();
  assert.equal(row!.alias, '');
});

test('admin list filters like the app: program, AOR month, stage, sort', async () => {
  const db = makeDb();
  const add = (over: Record<string, unknown>) => admin(db, 'POST', '/admin/community', timeline(over));
  await add({ program: 'cec', aorMonth: '2026-03', steps: [{ type: 'ITA', day: 0 }, { type: 'AOR Received', day: 30 }] });
  await add({ program: 'cec', aorMonth: '2026-04', steps: [{ type: 'AOR Received', day: 0 }, { type: 'Portal 1', day: 90 }] });
  await add({ program: 'fsw', aorMonth: undefined, steps: [{ type: 'ITA', day: 0 }] });
  const list = async (qs: string) => (await admin(db, 'GET', `/admin/community?${qs}`)).body;
  assert.equal((await list('program=cec')).total, 2);
  assert.equal((await list('aor=2026-03')).total, 1);
  assert.equal((await list('aor=none')).total, 1);
  assert.equal((await list('stage=decision')).total, 1);
  assert.equal((await list('program=cec&stage=aor')).total, 1);
  assert.equal((await list('program=nope')).total, 3); // unknown values are ignored
  assert.deepEqual((await list('')).aorMonths, ['2026-04', '2026-03']);
  assert.equal((await list('sort=longest')).items[0].lastDay, 90);
  assert.equal((await list('sort=furthest')).items[0].stage, 5);
});

test('admin list pages by limit and offset', async () => {
  const db = makeDb();
  for (let i = 0; i < 7; i++) await admin(db, 'POST', '/admin/community', timeline({ alias: `Seed${i}` }));
  const page = async (qs: string) => (await admin(db, 'GET', `/admin/community?${qs}`)).body;
  const p1 = await page('limit=3');
  assert.equal(p1.items.length, 3); assert.equal(p1.pageSize, 3); assert.equal(p1.total, 7);
  assert.equal((await page('limit=3&offset=6')).items.length, 1);
  assert.equal((await page('limit=999')).pageSize, 100);
  assert.equal((await page('limit=abc')).pageSize, 50);
  const seen = new Set([...(await page('limit=3')).items, ...(await page('limit=3&offset=3')).items, ...(await page('limit=3&offset=6')).items].map((t: any) => t.id));
  assert.equal(seen.size, 7);
});

test('COPR reaches only app builds that ask for it; older ones see a Final Decision', async () => {
  const db = makeDb();
  const put = await call(db, 'PUT', '/community/me', {
    key: KEY_A, body: timeline({ steps: [{ type: 'ITA', day: 0 }, { type: 'COPR', day: 200 }] }),
  });
  assert.equal(put.status, 200);
  const types = (t: any) => t.steps.map((s: any) => s.type);
  for (const [qs, last] of [['', 'Final Decision'], ['?copr=1', 'COPR']] as const) {
    assert.deepEqual(types((await call(db, 'GET', `/community${qs}`)).body.items[0]), ['ITA', last]);
    assert.deepEqual(types((await call(db, 'GET', `/community/${put.body.id}${qs}`)).body), ['ITA', last]);
  }
});
