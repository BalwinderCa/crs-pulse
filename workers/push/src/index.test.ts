import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkAndNotify, isAuthorized, isStale, mapCategory } from './index.ts';

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
