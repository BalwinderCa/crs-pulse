// Mirrors IRCC permanent-residence processing times into data/processing-times.json.
//
// canada.ca (Akamai) rejects Cloudflare Worker egress (HTTP 520) and bot-like
// clients, but GitHub-hosted runners are accepted — same reason fetch-latest-draw
// runs here. The mobile app then reads the normalized result from
// raw.githubusercontent.com (cache-first, with a bundled fallback).
//
// Source: https://www.canada.ca/content/dam/ircc/documents/json/flpt-en.json
//   `current-flpt`: program code -> "About N months" / "More than 10 years" / ...
//   `total-people`: program code -> "About 60,900 people waiting"
// Only month-based PR/economic/family/refugee/citizenship programs are mirrored;
// day-based temporary/PR-card/document times don't fit the app's month model and
// stay bundled.
//
// Usage:
//   node .github/scripts/fetch-processing-times.mjs            (fetch live)
//   node .github/scripts/fetch-processing-times.mjs --from f   (parse local file)

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const FLPT_URL = 'https://www.canada.ca/content/dam/ircc/documents/json/flpt-en.json';
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../../data/processing-times.json');

// IRCC `current-flpt` program code -> the app's ApplicationType id.
const CODE_TO_TYPE = {
  aip: 'aip',
  caregiver: 'caregivers',
  cec: 'ee_cec',
  fsw: 'ee_fsw',
  'pnp-ee': 'ee_pnp',
  'pnp-base': 'pnp_paper',
  qsw: 'qc_skilled',
  'quebec-business': 'qc_business',
  'self-employed': 'self_emp',
  'startup-visa': 'suv',
  'spousal-canada-roc': 'spouse_inland',
  'spousal-abroad-roc': 'spouse_outland',
  'dependants-abroad-roc': 'child',
  'pgp-roc': 'parents',
  'government-refugees-roc': 'refugee_gov',
  'private-refugees-roc': 'refugee_private',
  'humanitarian-roc': 'hc_case',
  'citizen-grants': 'citizenship',
  'citizen-proofs': 'cit_proof',
};

/** "About 7 months" -> 7, "More than 10 years" -> 120, "11 months" -> 11, else null. */
export function parseMonths(value) {
  if (typeof value !== 'string') return null;
  const v = value.toLowerCase();
  const years = v.match(/(\d+(?:\.\d+)?)\s*years?/);
  if (years) return Math.round(parseFloat(years[1]) * 12);
  const months = v.match(/(\d+(?:\.\d+)?)\s*months?/);
  if (months) return Math.round(parseFloat(months[1]));
  return null; // "Not enough data", "More than 10 years" with no number, etc.
}

/** "About 60,900 people waiting" -> 60900, else null. */
export function parsePeople(value) {
  if (typeof value !== 'string') return null;
  const m = value.replace(/,/g, '').match(/(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

/** Pure: turn the IRCC flpt payload into { updated, times: { typeId: { months, peopleWaiting? } } }. */
export function buildProcessingTimes(flpt) {
  const current = flpt?.['current-flpt'] ?? {};
  const people = flpt?.['total-people'] ?? {};
  const updated = flpt?.['default-update']?.flpt_lastupdated ?? null;

  const times = {};
  for (const [code, typeId] of Object.entries(CODE_TO_TYPE)) {
    const months = parseMonths(current[code]);
    if (months == null) continue; // no usable figure — leave the bundled value
    const entry = { months };
    const waiting = parsePeople(people[code]);
    if (waiting != null) entry.peopleWaiting = waiting;
    times[typeId] = entry;
  }
  return { updated, times };
}

function fetchFlpt() {
  // Use curl with its honest default UA — NOT a spoofed browser UA. canada.ca
  // (Akamai) resets the HTTP/2 stream for clients claiming to be Chrome that
  // don't match a browser fingerprint; the default curl UA is accepted. Mirrors
  // fetch-latest-draw.mjs.
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
        '--retry-all-errors',
        '-H', 'Accept: application/json, text/plain, */*',
        '-H', 'Accept-Language: en-CA,en;q=0.9',
        FLPT_URL,
      ],
      { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 },
    );
  } catch (err) {
    throw new Error(`flpt fetch failed: ${err.message}`);
  }
  return JSON.parse(body);
}

async function main() {
  const fromIdx = process.argv.indexOf('--from');
  const flpt =
    fromIdx !== -1
      ? JSON.parse(readFileSync(process.argv[fromIdx + 1], 'utf8'))
      : await fetchFlpt();

  const result = buildProcessingTimes(flpt);
  if (Object.keys(result.times).length === 0) {
    throw new Error('No processing times parsed — refusing to write empty output');
  }

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(result, null, 2) + '\n');
  console.log(`Wrote ${Object.keys(result.times).length} program times (updated ${result.updated}).`);
}

// Only run main() when executed directly (not when imported by a test).
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
