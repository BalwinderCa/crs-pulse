import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateTokenWithExpo } from './expoValidate.ts';

const TOKEN = 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]';

function fakeFetch(response: Partial<Response> & { jsonBody?: unknown; throws?: boolean }) {
  return (async () => {
    if (response.throws) throw new Error('network down');
    return {
      ok: response.ok ?? true,
      status: response.status ?? 200,
      json: async () => response.jsonBody,
    } as Response;
  }) as unknown as typeof fetch;
}

test('accepts a token Expo returns an ok ticket for', async () => {
  const ok = await validateTokenWithExpo(TOKEN, fakeFetch({ jsonBody: { data: [{ status: 'ok' }] } }));
  assert.equal(ok, true);
});

test('rejects a token Expo returns an error ticket for', async () => {
  const ok = await validateTokenWithExpo(
    TOKEN,
    fakeFetch({ jsonBody: { data: [{ status: 'error', details: { error: 'InvalidCredentials' } }] } }),
  );
  assert.equal(ok, false);
});

test('rejects on a request-level Expo error (malformed recipient)', async () => {
  const ok = await validateTokenWithExpo(
    TOKEN,
    fakeFetch({ jsonBody: { errors: [{ code: 'PUSH_TOO_MANY_EXPERIENCE_IDS' }] } }),
  );
  assert.equal(ok, false);
});

test('fails open on non-OK HTTP', async () => {
  const ok = await validateTokenWithExpo(TOKEN, fakeFetch({ ok: false, status: 503, jsonBody: {} }));
  assert.equal(ok, true);
});

test('fails open on a network error', async () => {
  const ok = await validateTokenWithExpo(TOKEN, fakeFetch({ throws: true }));
  assert.equal(ok, true);
});

test('fails open when Expo returns no ticket', async () => {
  const ok = await validateTokenWithExpo(TOKEN, fakeFetch({ jsonBody: { data: [] } }));
  assert.equal(ok, true);
});
