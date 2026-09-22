import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker, {
  checkAndNotify,
  collectStats,
  checkMirrorRuns,
  lastSuccessFrom,
  checkProcessingTimes,
  isAuthorized,
  isStale,
  mapCategory,
} from './index.ts';

// Minimal in-memory KV (mirrors tokenStore.test.ts's MockKV).
class MockKV {
  store = new Map<string, string>();

  async get(key: string): Promise<string | null> {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  async put(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }
  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }
  async list({ prefix = '', cursor }: { prefix?: string; cursor?: string } = {}) {
    const keys = [...this.store.keys()].filter((k) => k.startsWith(prefix)).sort();
    const start = cursor ? parseInt(cursor, 10) : 0;
    const end = start + 50;
    const page = keys.slice(start, end).map((name) => ({ name }));
    return end >= keys.length
      ? { keys: page, list_complete: true as const }
      : { keys: page, list_complete: false as const, cursor: String(end) };
  }
}

const MIRROR = {
  drawNumber: '420',
  drawCRS: '516',
  drawName: 'Canadian Experience Class',
  drawDate: '2026-06-23',
};

// Swap global fetch so fetchLatestDraw() reads our fake mirror, then restore.
function withMockMirror(record: unknown, fn: () => Promise<void>): Promise<void> {
  const original = globalThis.fetch;
  globalThis.fetch = (async () => ({ ok: true, json: async () => record })) as unknown as typeof fetch;
  return fn().finally(() => {
    globalThis.fetch = original;
  });
}

const req = (auth?: string) =>
  new Request('https://worker/register', auth ? { headers: { Authorization: auth } } : {});

// ─── mapCategory ──────────────────────────────────────────────────────────────
test('mapCategory maps known and pattern-matched draw names', () => {
  assert.equal(mapCategory('Canadian Experience Class'), 'CEC');
  assert.equal(mapCategory('Provincial Nominee Program'), 'PNP');
  assert.equal(mapCategory('Federal Skilled Worker'), 'General');
  assert.equal(mapCategory('French-Language proficiency 2026-Version 2'), 'French');
  assert.equal(mapCategory('Targeted Draw: Healthcare Occupations'), 'Healthcare');
  assert.equal(mapCategory('Some unrecognised round'), 'General');
});

// ─── isAuthorized ─────────────────────────────────────────────────────────────
test('isAuthorized requires an exact Bearer match and a configured secret', () => {
  assert.equal(isAuthorized(req('Bearer s3cret'), 's3cret'), true);
  assert.equal(isAuthorized(req('Bearer wrong'), 's3cret'), false);
  assert.equal(isAuthorized(req(), 's3cret'), false);
  assert.equal(isAuthorized(req('Bearer s3cret'), undefined), false); // fails closed
});

// ─── isStale (mirror freshness heartbeat) ─────────────────────────────────────
test('isStale flags only confidently-old draw dates', () => {
  const now = Date.parse('2026-06-23');
  assert.equal(isStale('2026-06-20', now, 30), false); // 3 days — fresh
  assert.equal(isStale('2026-06-23', now, 30), false); // today
  assert.equal(isStale('2026-05-01', now, 30), true); // ~53 days — stale
  assert.equal(isStale('', now, 30), false); // empty — don't false-alarm
  assert.equal(isStale('not-a-date', now, 30), false); // unparseable — don't false-alarm
});

// checkMirrorRuns reuses isStale on ISO run timestamps with a sub-day threshold.
test('isStale handles ISO timestamps and fractional-day thresholds', () => {
  const now = Date.parse('2026-06-23T12:00:00Z');
  const hours = 6 / 24;
  assert.equal(isStale('2026-06-23T09:00:00Z', now, hours), false); // 3h — mirror healthy
  assert.equal(isStale('2026-06-23T02:00:00Z', now, hours), true); // 10h — mirror down
});

test('checkMirrorRuns bypasses caches and re-arms after a recent successful run', async () => {
  const store = new MockKV();
  store.store.set('mirror_runs_stale_alerted', '2026-08-07T00:15:23Z');
  store.store.set('mirror_runs_stale_pending', '2026-08-07T00:15:23Z');

  const original = globalThis.fetch;
  let requestUrl: string | undefined;
  let requestInit: RequestInit | undefined;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return new Response(
      JSON.stringify({
        workflow_runs: [
          { updated_at: new Date(Date.now() - 60_000).toISOString(), conclusion: 'success' },
        ],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }) as typeof fetch;

  try {
    await checkMirrorRuns(store as unknown as KVNamespace, {
      TOKENS_KV: store as unknown as KVNamespace,
      GITHUB_DISPATCH_TOKEN: 'test-token',
    });
  } finally {
    globalThis.fetch = original;
  }

  assert.equal(requestInit?.cache, 'no-store');
  // A per-call param, so no cache between us and GitHub can replay an old listing.
  assert.match(requestUrl ?? '', /[?&]_cb=\d+/);
  assert.equal(store.store.has('mirror_runs_stale_alerted'), false);
  assert.equal(store.store.has('mirror_runs_stale_pending'), false);
});

// A stale reading is recorded, not mailed: that is the guard against the cached
// GitHub listings that mailed out mirror outages which never happened.
test('checkMirrorRuns does not email on the first stale reading', async () => {
  const store = new MockKV();
  const sends: string[] = [];

  const original = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('resend.com')) {
      sends.push(url);
      return new Response('{}', { status: 200 });
    }
    return new Response(
      JSON.stringify({
        workflow_runs: [
          { updated_at: new Date(Date.now() - 50 * 3_600_000).toISOString(), conclusion: 'success' },
        ],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }) as typeof fetch;

  const env = {
    TOKENS_KV: store as unknown as KVNamespace,
    GITHUB_DISPATCH_TOKEN: 'test-token',
    ALERT_EMAIL: 'ops@example.com',
    RESEND_API_KEY: 'rk',
    EMAIL_FROM: 'alerts@example.com',
  };

  try {
    await checkMirrorRuns(store as unknown as KVNamespace, env);
    assert.equal(sends.length, 0); // first sighting — recorded only
    assert.equal(store.store.has('mirror_runs_stale_pending'), true);

    // A tick later, still stale: now it is real and mails exactly once.
    store.store.set('mirror_runs_stale_pending', new Date(Date.now() - 20 * 60_000).toISOString());
    await checkMirrorRuns(store as unknown as KVNamespace, env);
    assert.equal(sends.length, 1);
    assert.equal(store.store.has('mirror_runs_stale_alerted'), true);

    await checkMirrorRuns(store as unknown as KVNamespace, env);
    assert.equal(sends.length, 1); // still one email for the same outage
  } finally {
    globalThis.fetch = original;
  }
});

test('lastSuccessFrom takes the newest success, or bounds the age when none is on the page', () => {
  assert.equal(
    lastSuccessFrom([
      { updated_at: '2026-09-19T10:00:00Z', conclusion: 'failure' },
      { updated_at: '2026-09-19T09:00:00Z', conclusion: 'success' },
      { updated_at: '2026-09-19T08:00:00Z', conclusion: 'success' },
    ]),
    '2026-09-19T09:00:00Z',
  );
  // No success on the page — the last one is older than the page, so report the
  // oldest run we can see and understate the outage rather than invent one.
  assert.equal(
    lastSuccessFrom([
      { updated_at: '2026-09-19T10:00:00Z', conclusion: 'failure' },
      { updated_at: '2026-09-19T08:00:00Z', conclusion: 'failure' },
    ]),
    '2026-09-19T08:00:00Z',
  );
  assert.equal(lastSuccessFrom([]), null);
});

// ─── checkAndNotify: the new-draw decision logic ──────────────────────────────
test('checkAndNotify: first run records the draw WITHOUT notifying', async () => {
  const store = new MockKV();
  await withMockMirror(MIRROR, async () => {
    const r = await checkAndNotify(store as unknown as KVNamespace);
    assert.equal(r.notified, false);
    assert.equal(r.draw_number, 420);
    assert.equal(store.store.get('last_draw_number'), '420');
  });
});

test('checkAndNotify: does NOT notify when latest <= last seen', async () => {
  const store = new MockKV();
  store.store.set('last_draw_number', '420');
  await withMockMirror(MIRROR, async () => {
    const r = await checkAndNotify(store as unknown as KVNamespace);
    assert.equal(r.notified, false);
    assert.equal(r.draw_number, 420);
  });
});

test('checkAndNotify: notifies and advances KV when a newer draw appears', async () => {
  const store = new MockKV();
  store.store.set('last_draw_number', '418');
  await withMockMirror(MIRROR, async () => {
    const r = await checkAndNotify(store as unknown as KVNamespace);
    assert.equal(r.notified, true);
    assert.equal(r.draw_number, 420);
    assert.equal(r.token_count, 0); // no tokens registered in this test
    assert.equal(store.store.get('last_draw_number'), '420');
  });
});

// ─── checkProcessingTimes: the IRCC estimate-change decision logic ────────────
const PROC = (months: number) => ({
  updated: 'August 10, 2026',
  // peopleWaiting drifts on every mirror refresh and must NOT count as a change.
  times: { ee_cec: { months, peopleWaiting: Math.random() }, ee_fsw: { months: 6 } },
});
const env = {} as unknown as Parameters<typeof checkProcessingTimes>[1];

test('checkProcessingTimes: first run records the baseline WITHOUT notifying', async () => {
  const store = new MockKV();
  await withMockMirror(PROC(6), async () => {
    const r = await checkProcessingTimes(store as unknown as KVNamespace, env);
    assert.equal(r.changed, false);
    assert.ok(store.store.get('processing_times_months'));
  });
});

test('checkProcessingTimes: unchanged months are not a change (peopleWaiting drift ignored)', async () => {
  const store = new MockKV();
  await withMockMirror(PROC(6), async () => {
    await checkProcessingTimes(store as unknown as KVNamespace, env); // baseline
    const r = await checkProcessingTimes(store as unknown as KVNamespace, env);
    assert.equal(r.changed, false);
  });
});

test('checkProcessingTimes: notifies and advances KV when months change', async () => {
  const store = new MockKV();
  await withMockMirror(PROC(6), async () => {
    await checkProcessingTimes(store as unknown as KVNamespace, env); // baseline
  });
  const baseline = store.store.get('processing_times_months');
  await withMockMirror(PROC(8), async () => {
    const r = await checkProcessingTimes(store as unknown as KVNamespace, env);
    assert.equal(r.changed, true);
    assert.equal(r.token_count, 0); // no tokens registered in this test
    assert.notEqual(store.store.get('processing_times_months'), baseline);
  });
});

// ─── /stats ───────────────────────────────────────────────────────────────────
test('collectStats counts tokens by platform without exposing any of them', async () => {
  const store = new MockKV();
  store.store.set('token:ExponentPushToken[a]', 'ios');
  store.store.set('token:ExponentPushToken[b]', 'ios');
  store.store.set('token:ExponentPushToken[c]', 'android');
  store.store.set('email:someone@example.com', '1');
  store.store.set('last_draw_number', '433');

  const stats = await collectStats(store as unknown as KVNamespace);

  assert.deepEqual(stats, {
    tokens: { total: 3, ios: 2, android: 1, unknown: 0 },
    emails: 1,
    pending_receipts: 0,
    last_draw_number: 433,
  });
  assert.doesNotMatch(JSON.stringify(stats), /ExponentPushToken|example\.com/);
});

// Past the per-invocation KV budget the split is dropped, not the whole answer.
test('collectStats reports the total alone for a very large registry', async () => {
  const store = new MockKV();
  for (let i = 0; i < 801; i++) store.store.set(`token:t${i}`, 'ios');

  const stats = await collectStats(store as unknown as KVNamespace);

  assert.deepEqual(stats.tokens, { total: 801, ios: null, android: null, unknown: null });
  assert.equal(stats.last_draw_number, null);
});

test('GET /stats requires SYNC_SECRET, not the push key shipped in the app', async () => {
  const store = new MockKV();
  const env = {
    TOKENS_KV: store as unknown as KVNamespace,
    SYNC_SECRET: 'ops-secret',
    PUSH_API_SECRET: 'app-key',
  };
  const get = (auth?: string) =>
    worker.fetch(
      new Request('https://worker/stats', auth ? { headers: { Authorization: auth } } : {}),
      env,
    );

  assert.equal((await get()).status, 401);
  assert.equal((await get('Bearer app-key')).status, 401);
  const ok = await get('Bearer ops-secret');
  assert.equal(ok.status, 200);
  assert.equal(((await ok.json()) as { tokens: { total: number } }).tokens.total, 0);
});
