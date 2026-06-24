// Tests for the IRCC mirror scripts. Run with: node --test .github/scripts/*.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { pickLatestRound, toMirrorRecord } from './fetch-latest-draw.mjs';
import { parseMonths, parsePeople, buildProcessingTimes } from './fetch-processing-times.mjs';

const here = dirname(fileURLToPath(import.meta.url));

// ─── fetch-latest-draw: selection logic ───────────────────────────────────────
test('pickLatestRound returns the highest drawNumber regardless of order', () => {
  const r = pickLatestRound([{ drawNumber: '418' }, { drawNumber: '420' }, { drawNumber: '419' }]);
  assert.equal(r.drawNumber, '420');
});

test('pickLatestRound ignores non-numeric / empty drawNumbers', () => {
  assert.equal(pickLatestRound([{ drawNumber: 'x' }, { drawNumber: '' }, {}]), null);
  assert.equal(pickLatestRound([{ drawNumber: 'x' }, { drawNumber: '5' }]).drawNumber, '5');
});

test('pickLatestRound handles empty / non-array input', () => {
  assert.equal(pickLatestRound([]), null);
  assert.equal(pickLatestRound(undefined), null);
});

test('toMirrorRecord keeps only the four mirror fields', () => {
  const out = toMirrorRecord({
    drawNumber: '420',
    drawCRS: '516',
    drawName: 'Canadian Experience Class',
    drawDate: '2026-06-23',
    extra: 'dropped',
  });
  assert.deepEqual(out, {
    drawNumber: '420',
    drawCRS: '516',
    drawName: 'Canadian Experience Class',
    drawDate: '2026-06-23',
  });
});

// ─── fetch-processing-times: parsing logic ────────────────────────────────────
test('parseMonths parses months, years and decimals; null on junk', () => {
  assert.equal(parseMonths('About 7 months'), 7);
  assert.equal(parseMonths('11 months'), 11);
  assert.equal(parseMonths('1.5 years'), 18);
  assert.equal(parseMonths('More than 10 years'), 120);
  assert.equal(parseMonths('Not enough data'), null);
  assert.equal(parseMonths(undefined), null);
});

test('parsePeople extracts a comma-grouped integer; null on junk', () => {
  assert.equal(parsePeople('About 60,900 people waiting'), 60900);
  assert.equal(parsePeople('n/a'), null);
  assert.equal(parsePeople(undefined), null);
});

test('buildProcessingTimes maps codes, skips unparseable months, keeps peopleWaiting', () => {
  const out = buildProcessingTimes({
    'current-flpt': { cec: 'About 5 months', fsw: 'Not enough data' },
    'total-people': { cec: 'About 1,200 people waiting' },
    'default-update': { flpt_lastupdated: 'June 8, 2026' },
  });
  assert.equal(out.updated, 'June 8, 2026');
  assert.deepEqual(out.times.ee_cec, { months: 5, peopleWaiting: 1200 });
  assert.equal(out.times.ee_fsw, undefined); // null months are skipped (keep bundled value)
});

// ─── REGRESSION GUARD: the bug that broke notifications for ~4 weeks ───────────
// canada.ca/Akamai resets the HTTP/2 stream for clients that spoof a browser
// User-Agent. The mirror must fetch via curl with its honest default UA.
test('mirror scripts do NOT spoof a browser User-Agent (Akamai bot-blocks it)', () => {
  for (const f of ['fetch-latest-draw.mjs', 'fetch-processing-times.mjs']) {
    const src = readFileSync(resolve(here, f), 'utf8');
    assert.ok(
      !/Mozilla\/|Chrome\/|AppleWebKit/i.test(src),
      `${f} must NOT spoof a browser User-Agent — Akamai resets it`,
    );
    assert.ok(/\bcurl\b/.test(src), `${f} should fetch via curl`);
  }
});
