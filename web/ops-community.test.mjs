import { test } from 'node:test';
import assert from 'node:assert/strict';
import { workerPath } from '../api/ops-community.mjs';

const ID = '3809c1c8-9e10-47fb-9074-93935c4454fa';

test('ops-community forwards only the admin routes it knows', () => {
  assert.equal(workerPath('GET', { q: 'maple', status: 'hidden', offset: '50', junk: 'x' }), '/admin/community?q=maple&status=hidden&offset=50');
  assert.equal(workerPath('POST', {}), '/admin/community');
  assert.equal(workerPath('GET', { stats: '1' }), '/admin/community/stats');
  assert.equal(workerPath('DELETE', { stats: '1' }), null);
  assert.equal(workerPath('PATCH', { id: ID }), `/admin/community/${ID}`);
  assert.equal(workerPath('DELETE', { id: ID }), `/admin/community/${ID}`);
  assert.equal(workerPath('GET', { id: ID, reports: '1' }), `/admin/community/${ID}/reports`);
  assert.equal(workerPath('DELETE', { id: ID, reports: '1' }), `/admin/community/${ID}/reports`);
  // No path tricks, no other methods.
  assert.equal(workerPath('PATCH', { id: '../../stats' }), null);
  assert.equal(workerPath('PATCH', {}), null);
  assert.equal(workerPath('PUT', { id: ID }), null);
  assert.equal(workerPath('POST', { id: ID, reports: '1' }), null);
});
