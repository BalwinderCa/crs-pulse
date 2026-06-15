import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchExpoReceipts } from './expoReceipts.ts';

function fakeFetch(response: { ok?: boolean; status?: number; jsonBody?: unknown; throws?: boolean }) {
  return (async () => {
    if (response.throws) throw new Error('network down');
    return {
      ok: response.ok ?? true,
      status: response.status ?? 200,
      json: async () => response.jsonBody,
    } as Response;
  }) as unknown as typeof fetch;
}

test('returns an empty map for no ids (no network call)', async () => {
  const out = await fetchExpoReceipts([], fakeFetch({ jsonBody: { data: { x: { status: 'ok' } } } }));
  assert.deepEqual(out, {});
});

test('parses the receipt map', async () => {
  const out = await fetchExpoReceipts(
    ['a', 'b'],
    fakeFetch({
      jsonBody: {
        data: {
          a: { status: 'ok' },
          b: { status: 'error', details: { error: 'DeviceNotRegistered' } },
        },
      },
    }),
  );
  assert.equal(out.a?.status, 'ok');
  assert.equal(out.b?.details?.error, 'DeviceNotRegistered');
});

test('fails safe (empty map) on non-OK HTTP', async () => {
  assert.deepEqual(await fetchExpoReceipts(['a'], fakeFetch({ ok: false, status: 502 })), {});
});

test('fails safe (empty map) on network error', async () => {
  assert.deepEqual(await fetchExpoReceipts(['a'], fakeFetch({ throws: true })), {});
});

test('fails safe (empty map) when data is missing', async () => {
  assert.deepEqual(await fetchExpoReceipts(['a'], fakeFetch({ jsonBody: {} })), {});
});
