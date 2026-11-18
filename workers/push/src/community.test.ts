import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { REPORT_HIDE_AT, aliasAllowed, cleanTimeline, handleCommunity } from './community.ts';

/** Just enough of D1 over node:sqlite, with the real migration applied. */
function makeDb() {
  const db = new DatabaseSync(':memory:');
  for (const f of ['0001_community.sql', '0002_community_moderation.sql']) {
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
