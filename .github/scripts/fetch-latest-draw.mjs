// Fetches the official IRCC Express Entry rounds feed and writes the latest
// draw to data/latest-draw.json.
//
// We shell out to `curl` and DO NOT spoof a browser User-Agent. canada.ca
// (Akamai) bot-mitigation resets the HTTP/2 stream (curl exit 92 / read
// ETIMEDOUT on runners) when a client claims to be Chrome but doesn't match a
// real browser TLS/HTTP-2 fingerprint — curl's honest default UA is accepted,
// the Chrome-UA spoof is not. (Node's undici fetch was being reset the same
// way.) Runs on GitHub-hosted runners; the push worker reads the committed file
// from raw.githubusercontent.com (canada.ca rejects Cloudflare egress, HTTP 520).

import { writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const IRCC_URL =
  'https://www.canada.ca/content/dam/ircc/documents/json/ee_rounds_123_en.json';
const OUT = 'data/latest-draw.json';
// The push worker only needs the latest round; the website needs recent history and the
// pool distribution, and this job already has the whole feed in hand.
const SITE_OUT = 'data/ee-rounds.json';
const SITE_ROUNDS = 20;

/** Pick the round with the highest numeric drawNumber. Pure — unit tested. */
export function pickLatestRound(rounds) {
  let latest = null;
  for (const r of Array.isArray(rounds) ? rounds : []) {
    const n = parseInt(r?.drawNumber, 10);
    if (!n) continue;
    if (!latest || n > parseInt(latest.drawNumber, 10)) latest = r;
  }
  return latest;
}

/** Reduce an IRCC round to the mirror's stored shape. Pure — unit tested. */
export function toMirrorRecord(round) {
  return {
    drawNumber: round.drawNumber,
    drawCRS: round.drawCRS,
    drawName: round.drawName,
    drawDate: round.drawDate,
  };
}

/** Parse an IRCC count like "5,000" — returns 0 when the field is absent or junk. */
const count = (v) => {
  const n = Number.parseInt(String(v ?? '').replace(/,/g, ''), 10);
  return Number.isFinite(n) ? n : 0;
};

/**
 * IRCC ships the pool distribution with every round as dd1–dd18. dd3 and dd9 are
 * roll-ups of the finer bands that follow them (dd4–dd8 sum to dd3, dd10–dd14 to dd9)
 * and dd18 is the total, so only the seven top-level bands are kept.
 */
export const POOL_BANDS = [
  ['dd1', '601–1200'],
  ['dd2', '501–600'],
  ['dd3', '451–500'],
  ['dd9', '401–450'],
  ['dd15', '351–400'],
  ['dd16', '301–350'],
  ['dd17', '0–300'],
];

/**
 * IRCC suffixes category rounds with the selection year and revision — "Transport
 * Occupations, 2026-Version 2". Strip it for display and for counting distinct
 * categories. Pure — unit tested.
 */
export const cleanDrawName = (name) =>
  String(name ?? '').replace(/[,\s]+\d{4}[-\s]*Version\s*\d+\s*$/i, '').trim();

/** Reduce an IRCC round to what the website renders. Pure — unit tested. */
export function toSiteRound(round) {
  return {
    number: String(round.drawNumber ?? ''),
    date: String(round.drawDate ?? '').slice(0, 10),
    dateFull: round.drawDateFull ?? null,
    name: round.drawName ?? '',
    label: cleanDrawName(round.drawName),
    size: count(round.drawSize),
    crs: count(round.drawCRS),
  };
}

/**
 * Year-to-date totals for the calendar year of the latest round, taken from the whole
 * feed rather than the trimmed window the site renders. Pure — unit tested.
 */
export function buildYtd(rounds, year) {
  const inYear = rounds.filter((r) => String(r?.drawDate ?? '').startsWith(String(year)));
  return {
    year: Number(year),
    rounds: inYear.length,
    invitations: inYear.reduce((sum, r) => sum + count(r.drawSize), 0),
    categories: new Set(inYear.map((r) => cleanDrawName(r.drawName)).filter(Boolean)).size,
  };
}

/**
 * Most recent rounds (newest first) plus the pool distribution published with the
 * latest one. Returns null when the feed has nothing usable. Pure — unit tested.
 */
export function buildSiteFeed(rounds, limit = SITE_ROUNDS) {
  const usable = (Array.isArray(rounds) ? rounds : [])
    .filter((r) => parseInt(r?.drawNumber, 10) && String(r?.drawDate ?? '').length >= 10)
    .sort((a, b) => parseInt(b.drawNumber, 10) - parseInt(a.drawNumber, 10))
    .slice(0, limit);
  if (!usable.length) return null;
  const latest = usable[0];
  return {
    updated: String(latest.drawDate).slice(0, 10),
    updatedFull: latest.drawDateFull ?? null,
    distributionAsOf: latest.drawDistributionAsOn ?? null,
    rounds: usable.map(toSiteRound),
    pool: POOL_BANDS.map(([field, label]) => ({ label, count: count(latest[field]) })).filter((b) => b.count > 0),
    poolTotal: count(latest.dd18),
    ytd: buildYtd(Array.isArray(rounds) ? rounds : [], String(latest.drawDate).slice(0, 4)),
  };
}

function fetchRounds() {
  let body;
  try {
    body = execFileSync(
      'curl',
      [
        '-fsS',
        '--compressed',
        '--max-time', '30',
        '--retry', '6',
        '--retry-delay', '3',
        // canada.ca/Akamai intermittently resets the HTTP/2 stream (curl exit 92);
        // --retry-all-errors makes --retry cover those protocol errors too.
        '--retry-all-errors',
        '-H', 'Accept: application/json, text/plain, */*',
        '-H', 'Accept-Language: en-CA,en;q=0.9',
        IRCC_URL,
      ],
      { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 },
    );
  } catch (err) {
    console.error(`IRCC fetch failed: ${err.message}`);
    process.exit(1);
  }
  let json;
  try {
    json = JSON.parse(body);
  } catch {
    console.error('IRCC feed was not valid JSON');
    process.exit(1);
  }
  return Array.isArray(json.rounds) ? json.rounds : [];
}

function main() {
  const rounds = fetchRounds();
  const latest = pickLatestRound(rounds);
  if (!latest) {
    console.error('No valid rounds in IRCC feed');
    process.exit(1);
  }
  const out = toMirrorRecord(latest);
  writeFileSync(OUT, `${JSON.stringify(out, null, 2)}\n`);
  console.log(`Wrote draw #${out.drawNumber} (${out.drawName}, CRS ${out.drawCRS})`);

  const site = buildSiteFeed(rounds);
  if (!site) {
    console.error('No usable rounds for the website feed');
    process.exit(1);
  }
  writeFileSync(SITE_OUT, `${JSON.stringify(site, null, 2)}\n`);
  console.log(`Wrote ${site.rounds.length} rounds + ${site.pool.length} pool bands for the website`);
}

// Only run main() when executed directly (not when imported by a test).
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main();
}
