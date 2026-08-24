// Tests for the IRCC mirror scripts. Run with: node --test .github/scripts/*.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { pickLatestRound, toMirrorRecord, toSiteRound, buildSiteFeed, buildYtd, cleanDrawName, POOL_BANDS } from './fetch-latest-draw.mjs';
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

// ─── fetch-latest-draw: website feed ──────────────────────────────────────────
const round = (n, over = {}) => ({
  drawNumber: String(n),
  drawDate: `2026-08-${String(n % 28 || 1).padStart(2, '0')}`,
  drawDateFull: `August ${n % 28 || 1}, 2026`,
  drawName: 'Canadian Experience Class',
  drawSize: '1,000',
  drawCRS: '523',
  ...over,
});

test('toSiteRound parses comma-grouped counts and trims the date', () => {
  assert.deepEqual(
    toSiteRound({ drawNumber: '437', drawDate: '2026-08-19T00:00:00', drawDateFull: 'August 19, 2026', drawName: 'French', drawSize: '5,000', drawCRS: '382' }),
    { number: '437', date: '2026-08-19', dateFull: 'August 19, 2026', name: 'French', label: 'French', size: 5000, crs: 382 },
  );
});

test('toSiteRound survives missing fields rather than emitting NaN', () => {
  const out = toSiteRound({ drawNumber: '91b', drawDate: '2015-01-02' });
  assert.equal(out.number, '91b');
  assert.equal(out.size, 0);
  assert.equal(out.crs, 0);
  assert.equal(out.name, '');
  assert.equal(out.label, '');
});

test('cleanDrawName strips the IRCC selection-year/version suffix', () => {
  assert.equal(cleanDrawName('Transport Occupations, 2026-Version 2'), 'Transport Occupations');
  assert.equal(cleanDrawName('French-Language proficiency 2026-Version 2'), 'French-Language proficiency');
  assert.equal(cleanDrawName('Canadian Experience Class'), 'Canadian Experience Class');
  assert.equal(cleanDrawName(undefined), '');
});

test('buildYtd totals only the requested calendar year', () => {
  const ytd = buildYtd(
    [
      { drawDate: '2026-08-19', drawSize: '5,000', drawName: 'French-Language proficiency 2026-Version 2' },
      { drawDate: '2026-08-18', drawSize: '1,000', drawName: 'Canadian Experience Class' },
      { drawDate: '2026-08-06', drawSize: '2,000', drawName: 'French-Language proficiency 2026-Version 1' },
      { drawDate: '2025-12-31', drawSize: '9,000', drawName: 'Canadian Experience Class' },
    ],
    '2026',
  );
  // The two French rounds differ only by version, so they are one category.
  assert.deepEqual(ytd, { year: 2026, rounds: 3, invitations: 8000, categories: 2 });
});

test('buildSiteFeed returns the newest rounds first, capped at the limit', () => {
  const feed = buildSiteFeed([round(430), round(437), round(435)], 2);
  assert.deepEqual(feed.rounds.map((r) => r.number), ['437', '435']);
  assert.equal(feed.updated, feed.rounds[0].date);
});

test('buildSiteFeed keeps only the seven top-level CRS bands', () => {
  // dd4-dd8 roll up into dd3 and dd10-dd14 into dd9; including them would double-count.
  const dd = Object.fromEntries(Array.from({ length: 18 }, (_, i) => [`dd${i + 1}`, String((i + 1) * 100)]));
  const feed = buildSiteFeed([round(437, dd)]);
  assert.deepEqual(feed.pool.map((b) => b.label), POOL_BANDS.map(([, label]) => label));
  assert.deepEqual(feed.pool.map((b) => b.count), [100, 200, 300, 900, 1500, 1600, 1700]);
  assert.equal(feed.poolTotal, 1800);
});

test('buildSiteFeed drops rounds with no usable number or date, and empties to null', () => {
  const feed = buildSiteFeed([round(437), { drawNumber: 'x' }, { drawNumber: '400', drawDate: '' }]);
  assert.deepEqual(feed.rounds.map((r) => r.number), ['437']);
  assert.equal(buildSiteFeed([]), null);
  assert.equal(buildSiteFeed(undefined), null);
});

test('buildSiteFeed omits bands IRCC did not publish instead of charting zeros', () => {
  const feed = buildSiteFeed([round(437, { dd1: '439', dd2: '', dd18: '439' })]);
  assert.deepEqual(feed.pool, [{ label: '601–1200', count: 439 }]);
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
