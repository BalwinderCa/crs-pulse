// Push a one-off notice (e.g. "please update") to every device with draw alerts on.
// Tokens are read from the worker's KV with wrangler and never printed; only counts are.
//
//   node workers/push/scripts/send-update-push.mjs --title "…" --body "…" [--platform ios|android|all]
//   node workers/push/scripts/send-update-push.mjs --title "…" --body "…" [--platform …] --send
//
// Without --send it is a dry run: it counts the target devices and prints the exact text.
// --platform defaults to ios. The worker stores only token -> platform, not app version,
// so a message cannot target one app version: write it so it is accurate for users who
// are already up to date. Don't ask people to tap it if the bug it's about crashes the
// app on launch, since tapping opens the app. A push can't be recalled, and every --send
// reaches every target again: never pass --send while testing the script itself.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

const NAMESPACE = '588cfb0021b2409e9f5dc1083b0497e8';
// No handler for this type in the app, so tapping just opens it.
const DATA = { type: 'app_update' };
const USAGE = 'usage: send-update-push.mjs --title <text> --body <text> [--platform ios|android|all] [--send]';

let opts;
try {
  ({ values: opts } = parseArgs({
    options: {
      send: { type: 'boolean', default: false },
      title: { type: 'string' },
      body: { type: 'string' },
      platform: { type: 'string', default: 'ios' },
    },
  }));
} catch (e) {
  console.error(`${e.message}\n${USAGE}`);
  process.exit(2);
}
const title = opts.title?.trim();
const body = opts.body?.trim();
if (!title || !body || !['ios', 'android', 'all'].includes(opts.platform)) {
  console.error(USAGE);
  process.exit(2);
}

const wrangler = (args) =>
  execFileSync('npx', ['wrangler', 'kv', ...args, '--namespace-id', NAMESPACE, '--remote'], {
    // The worker's own wrangler, not whatever npx resolves from the caller's directory.
    cwd: new URL('..', import.meta.url),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
    maxBuffer: 64 * 1024 * 1024,
  });

const keys = JSON.parse(wrangler(['key', 'list', '--prefix', 'token:'])).map((k) => k.name);
const dir = mkdtempSync(join(tmpdir(), 'crs-push-'));
const values = {};
try {
  // Cloudflare's bulk get takes at most 100 keys per request.
  for (let i = 0; i < keys.length; i += 100) {
    const keyFile = join(dir, `keys-${i}.json`);
    writeFileSync(keyFile, JSON.stringify(keys.slice(i, i + 100)));
    Object.assign(values, JSON.parse(wrangler(['bulk', 'get', keyFile])));
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}

const targets = Object.entries(values)
  .filter(([, platform]) => opts.platform === 'all' || platform === opts.platform)
  .map(([key]) => key.slice('token:'.length));
console.log(`tokens: ${keys.length} total, ${targets.length} for platform ${opts.platform}`);
console.log(`text: "${title}: ${body}"`);
if (!opts.send) {
  console.log('dry run, nothing sent. Add --send to send.');
  process.exit(0);
}

let ok = 0;
const errors = {};
for (let i = 0; i < targets.length; i += 100) {
  const chunk = targets.slice(i, i + 100);
  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(chunk.map((to) => ({ to, title, body, data: DATA, sound: 'default', priority: 'high' }))),
  });
  if (!res.ok) {
    errors[`HTTP ${res.status}`] = (errors[`HTTP ${res.status}`] ?? 0) + chunk.length;
    continue;
  }
  const { data = [] } = await res.json();
  for (const t of data) {
    if (t.status === 'ok') ok += 1;
    else {
      const e = t.details?.error ?? t.message ?? 'unknown';
      errors[e] = (errors[e] ?? 0) + 1;
    }
  }
}
console.log(`sent: ${ok} accepted by Expo, errors: ${JSON.stringify(errors)}`);
