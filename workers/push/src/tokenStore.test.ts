import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  TOKEN_PREFIX,
  LEGACY_TOKENS_KEY,
  registerToken,
  revokeToken,
  revokeTokens,
  listTokens,
  migrateLegacyTokens,
} from './tokenStore.ts';

// Minimal in-memory KV that mimics Cloudflare KV semantics, including
// cursor-based pagination (page size 2) so listTokens' paging is exercised.
class MockKV {
  store = new Map<string, string>();
  putCalls = 0;

  async get(key: string): Promise<string | null> {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  async put(key: string, value: string): Promise<void> {
    this.putCalls++;
    this.store.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async list({ prefix = '', cursor }: { prefix?: string; cursor?: string } = {}) {
    const keys = [...this.store.keys()].filter((k) => k.startsWith(prefix)).sort();
    const start = cursor ? parseInt(cursor, 10) : 0;
    const end = start + 2;
    const page = keys.slice(start, end).map((name) => ({ name }));
    return end >= keys.length
      ? { keys: page, list_complete: true as const }
      : { keys: page, list_complete: false as const, cursor: String(end) };
  }
}

const kv = () => new MockKV() as unknown as KVNamespace;
const isValid = (t: string) => /^(ExponentPushToken|ExpoPushToken)\[[^\]]+\]$/.test(t);

test('registerToken stores one key per token, idempotently', async () => {
  const store = new MockKV();
  const k = store as unknown as KVNamespace;
  await registerToken(k, 'ExpoPushToken[a]', 'ios');
  await registerToken(k, 'ExpoPushToken[a]', 'ios'); // duplicate
  await registerToken(k, 'ExpoPushToken[b]', 'android');

  assert.equal(store.store.size, 2);
  assert.equal(store.store.get(`${TOKEN_PREFIX}ExpoPushToken[a]`), 'ios');
  assert.equal(store.store.get(`${TOKEN_PREFIX}ExpoPushToken[b]`), 'android');
});

test('concurrent registrations never lose writes (race regression)', async () => {
  const store = new MockKV();
  const k = store as unknown as KVNamespace;
  const tokens = Array.from({ length: 200 }, (_, i) => `ExpoPushToken[${i}]`);

  // Fire all registrations concurrently — the old single-array model dropped
  // writes here; per-key writes must retain every token.
  await Promise.all(tokens.map((t) => registerToken(k, t, 'ios')));

  const listed = await listTokens(k);
  assert.equal(listed.length, 200);
  assert.deepEqual([...listed].sort(), [...tokens].sort());
});

test('listTokens paginates through the full cursor set', async () => {
  const store = new MockKV();
  const k = store as unknown as KVNamespace;
  for (let i = 0; i < 7; i++) await registerToken(k, `ExpoPushToken[${i}]`, 'ios');

  const listed = await listTokens(k);
  assert.equal(listed.length, 7); // 7 > page size 2 → multiple cursor hops
});

test('revokeToken / revokeTokens remove keys', async () => {
  const store = new MockKV();
  const k = store as unknown as KVNamespace;
  await registerToken(k, 'ExpoPushToken[a]', 'ios');
  await registerToken(k, 'ExpoPushToken[b]', 'ios');
  await registerToken(k, 'ExpoPushToken[c]', 'ios');

  await revokeToken(k, 'ExpoPushToken[a]');
  await revokeTokens(k, ['ExpoPushToken[b]', 'ExpoPushToken[c]']);

  assert.deepEqual(await listTokens(k), []);
});

test('migrateLegacyTokens folds array into per-key entries then drops legacy key', async () => {
  const store = new MockKV();
  const k = store as unknown as KVNamespace;
  store.store.set(
    LEGACY_TOKENS_KEY,
    JSON.stringify([
      { token: 'ExpoPushToken[a]', platform: 'ios' },
      { token: 'ExpoPushToken[b]', platform: 'android' },
      { token: 'not-a-token', platform: 'ios' }, // invalid → skipped
    ]),
  );

  const migrated = await migrateLegacyTokens(k, isValid);
  assert.equal(migrated, 2);
  assert.equal(store.store.has(LEGACY_TOKENS_KEY), false);
  assert.deepEqual((await listTokens(k)).sort(), ['ExpoPushToken[a]', 'ExpoPushToken[b]']);

  // Second call is a no-op.
  assert.equal(await migrateLegacyTokens(k, isValid), 0);
});

test('migration does not resurrect a token revoked during the transition window', async () => {
  const store = new MockKV();
  const k = store as unknown as KVNamespace;

  // Legacy array still holds A and B (worker not yet redeployed/migrated).
  store.store.set(
    LEGACY_TOKENS_KEY,
    JSON.stringify([
      { token: 'ExpoPushToken[a]', platform: 'ios' },
      { token: 'ExpoPushToken[b]', platform: 'ios' },
    ]),
  );

  // User revokes A before migration runs.
  await revokeToken(k, 'ExpoPushToken[a]');

  const migrated = await migrateLegacyTokens(k, isValid);

  assert.equal(migrated, 1); // only B
  assert.deepEqual(await listTokens(k), ['ExpoPushToken[b]']);
  assert.equal(store.store.has(`${TOKEN_PREFIX}ExpoPushToken[a]`), false);
});

test('migrateLegacyTokens drops a corrupt legacy blob safely', async () => {
  const store = new MockKV();
  const k = store as unknown as KVNamespace;
  store.store.set(LEGACY_TOKENS_KEY, '{not json');

  const migrated = await migrateLegacyTokens(k, isValid);
  assert.equal(migrated, 0);
  assert.equal(store.store.has(LEGACY_TOKENS_KEY), false);
});

void kv; // silence unused in environments that tree-shake helpers
