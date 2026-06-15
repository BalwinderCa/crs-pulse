// Fetches the official IRCC Express Entry rounds feed and writes the latest
// draw to data/latest-draw.json. Runs on GitHub-hosted runners, whose egress
// canada.ca (Akamai) accepts — unlike Cloudflare Worker egress, which is
// rejected with HTTP 520. The push worker reads the committed file from
// raw.githubusercontent.com instead of hitting canada.ca directly.

import { writeFileSync } from 'node:fs';

const IRCC_URL =
  'https://www.canada.ca/content/dam/ircc/documents/json/ee_rounds_123_en.json';
const OUT = 'data/latest-draw.json';

const res = await fetch(IRCC_URL, { headers: { Accept: 'application/json' } });
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

const out = {
  drawNumber: latest.drawNumber,
  drawCRS: latest.drawCRS,
  drawName: latest.drawName,
  drawDate: latest.drawDate,
};

writeFileSync(OUT, `${JSON.stringify(out, null, 2)}\n`);
console.log(`Wrote draw #${out.drawNumber} (${out.drawName}, CRS ${out.drawCRS})`);
