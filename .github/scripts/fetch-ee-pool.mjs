// Mirrors the IRCC Express Entry pool composition into data/ee-pool.json.
//
// The pool distribution is embedded in every round of the same rounds feed used
// for draws: the dd1..dd18 fields hold the candidate counts by CRS range, "as
// of" that round's draw date. Verified mapping (sub-bands sum to their parent,
// and all top-level bands sum to dd18):
//   dd1  601–1200      dd9  401–450 (= dd10..dd14)
//   dd2  501–600       dd15 351–400
//   dd3  451–500       dd16 301–350
//        (= dd4..dd8)  dd17 0–300
//                      dd18 total
//
// The Immigration Levels Plan (`levels`) is published annually and is NOT in
// the feed, so it (and `source`) is preserved from the existing file.

import { readFileSync, writeFileSync } from 'node:fs';

const IRCC_URL =
  'https://www.canada.ca/content/dam/ircc/documents/json/ee_rounds_123_en.json';
const OUT = 'data/ee-pool.json';

const num = (s) => parseInt(String(s ?? '').replace(/,/g, ''), 10);

const res = await fetch(IRCC_URL, {
  headers: {
    // canada.ca (Akamai) is more permissive to browser-like requests.
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
    Accept: 'application/json, text/plain, */*',
    'Accept-Language': 'en-CA,en;q=0.9',
  },
});
if (!res.ok) {
  console.error(`IRCC fetch failed: HTTP ${res.status}`);
  process.exit(1);
}
const json = await res.json();
const rounds = Array.isArray(json.rounds) ? json.rounds : [];

let latest = null;
for (const r of rounds) {
  const n = parseInt(r.drawNumber, 10);
  if (!n) continue;
  if (!latest || n > parseInt(latest.drawNumber, 10)) latest = r;
}
if (!latest) {
  console.error('No valid rounds in IRCC feed');
  process.exit(1);
}

const b601 = num(latest.dd1);   // 601–1200
const b501 = num(latest.dd2);   // 501–600
const b451 = num(latest.dd3);   // 451–500
const b401 = num(latest.dd9);   // 401–450
const b351 = num(latest.dd15);  // 351–400
const b301 = num(latest.dd16);  // 301–350
const b0 = num(latest.dd17);    // 0–300
const total = num(latest.dd18);

const parts = [b601, b501, b451, b401, b351, b301, b0, total];
if (parts.some((c) => !Number.isFinite(c))) {
  console.error('Pool distribution fields missing/invalid in IRCC feed');
  process.exit(1);
}
// Sanity check: the published bands must add up to the published total.
const sum = b601 + b501 + b401 + b451 + b351 + b301 + b0;
if (sum !== total) {
  console.error(`Pool distribution sum ${sum} != total ${total}; aborting to avoid bad data`);
  process.exit(1);
}

const prev = JSON.parse(readFileSync(OUT, 'utf8'));

const out = {
  ...prev,
  updated: latest.drawDateFull || latest.drawDate,
  note:
    'Pool composition is auto-mirrored from the IRCC rounds feed (dd fields, as of the latest draw date). Immigration Levels Plan targets update annually and are maintained manually.',
  pool: {
    total,
    distribution: [
      { band: '601–1200', min: 601, max: 1200, count: b601 },
      { band: '501–600', min: 501, max: 600, count: b501 },
      { band: '451–500', min: 451, max: 500, count: b451 },
      { band: '401–450', min: 401, max: 450, count: b401 },
      { band: '351–400', min: 351, max: 400, count: b351 },
      { band: '0–350', min: 0, max: 350, count: b301 + b0 },
    ],
  },
};

writeFileSync(OUT, `${JSON.stringify(out, null, 2)}\n`);
console.log(`Wrote EE pool composition as of ${out.updated} (total ${total.toLocaleString()})`);
