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

const IRCC_URL =
  'https://www.canada.ca/content/dam/ircc/documents/json/ee_rounds_123_en.json';
const OUT = 'data/latest-draw.json';

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

const out = {
  drawNumber: latest.drawNumber,
  drawCRS: latest.drawCRS,
  drawName: latest.drawName,
  drawDate: latest.drawDate,
};

writeFileSync(OUT, `${JSON.stringify(out, null, 2)}\n`);
console.log(`Wrote draw #${out.drawNumber} (${out.drawName}, CRS ${out.drawCRS})`);
