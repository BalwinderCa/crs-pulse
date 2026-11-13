#!/usr/bin/env node
// Connects the /pulse-hq dashboard to the AdMob API (read-only). Run once, in your own
// terminal, from the repo root:
//
//   node scripts/admob-setup.mjs ~/Downloads/client_secret_XXXX.json
//
// The JSON is a Google Cloud OAuth client of type "Desktop app" (see CLAUDE.md). The script
// opens Google's consent page in your browser, where you sign in with the Google account that
// owns the AdMob account and allow "See your AdMob data". Google sends the answer back to a
// one-off server on 127.0.0.1. The script then checks the AdMob API answers, prints last
// week's earnings as proof, and stores ADMOB_CLIENT_ID, ADMOB_CLIENT_SECRET,
// ADMOB_REFRESH_TOKEN and ADMOB_PUBLISHER_ID in Vercel Production. Redeploy afterwards.
import { createHash, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { spawnSync } from 'node:child_process';
import { admobStats } from '../api/_admob.mjs';

const SCOPE = 'https://www.googleapis.com/auth/admob.readonly';

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/admob-setup.mjs <client_secret_….json>');
  process.exit(1);
}
const json = JSON.parse(readFileSync(file.replace(/^~/, process.env.HOME), 'utf8'));
const client = json.installed ?? json.web;
if (!client?.client_id || !client?.client_secret) {
  console.error('That file has no client_id/client_secret. Download the JSON of a "Desktop app" OAuth client.');
  process.exit(1);
}

const who = spawnSync('vercel', ['whoami'], { encoding: 'utf8' }).stdout.trim();
if (who !== 'admin-73711109') {
  console.error(`Vercel CLI is logged in as "${who}". Log in as admin-73711109 first (vercel login).`);
  process.exit(1);
}

// PKCE + state, and a loopback redirect on a random free port.
const verifier = randomBytes(32).toString('base64url');
const challenge = createHash('sha256').update(verifier).digest('base64url');
const state = randomBytes(16).toString('hex');

const code = await new Promise((resolve, reject) => {
  let port;
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    if (url.pathname !== '/') { res.writeHead(404).end(); return; }
    const ok = url.searchParams.get('state') === state && url.searchParams.get('code');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(ok ? '<p>AdMob connected. You can close this tab and go back to the terminal.</p>'
      : `<p>Not connected: ${String(url.searchParams.get('error') ?? 'state mismatch').replace(/[<>&]/g, '')}</p>`);
    server.close();
    ok ? resolve({ code: url.searchParams.get('code'), redirect: `http://127.0.0.1:${port}` })
      : reject(new Error(url.searchParams.get('error') ?? 'state mismatch'));
  });
  server.listen(0, '127.0.0.1', () => {
    port = server.address().port;
    const auth = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    Object.entries({
      client_id: client.client_id,
      redirect_uri: `http://127.0.0.1:${port}`,
      response_type: 'code',
      scope: SCOPE,
      access_type: 'offline',
      prompt: 'consent',
      state,
      code_challenge: challenge,
      code_challenge_method: 'S256',
    }).forEach(([k, v]) => auth.searchParams.set(k, v));
    console.log('Opening Google sign-in in your browser. If it does not open, visit:\n' + auth + '\n');
    spawnSync('open', [auth.toString()]);
  });
  setTimeout(() => { server.close(); reject(new Error('timed out after 5 minutes')); }, 5 * 60 * 1000).unref();
});

const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'authorization_code',
    code: code.code,
    redirect_uri: code.redirect,
    client_id: client.client_id,
    client_secret: client.client_secret,
    code_verifier: verifier,
  }),
});
const tokens = await tokenRes.json();
if (!tokens.refresh_token) {
  console.error('Google returned no refresh token:', tokens.error ?? '', tokens.error_description ?? '');
  process.exit(1);
}

const accounts = await fetch('https://admob.googleapis.com/v1/accounts', {
  headers: { Authorization: `Bearer ${tokens.access_token}` },
}).then((r) => r.json());
const publisher = accounts.account?.[0]?.publisherId;
if (!publisher) {
  console.error('No AdMob account for that Google login:', JSON.stringify(accounts).slice(0, 300));
  process.exit(1);
}
console.log(`AdMob account: ${publisher}${accounts.account.length > 1 ? ` (first of ${accounts.account.length})` : ''}`);

const env = {
  ADMOB_CLIENT_ID: client.client_id,
  ADMOB_CLIENT_SECRET: client.client_secret,
  ADMOB_REFRESH_TOKEN: tokens.refresh_token,
  ADMOB_PUBLISHER_ID: publisher,
};
const stats = await admobStats(env);
const money = (v) => `${stats.currency} ${v.toFixed(2)}`;
console.log(`Check: last 7 days ${money(stats.last7.earnings)}, yesterday ${money(stats.yesterday.earnings)}, last month ${money(stats.lastMonth.earnings)} (CRS Pulse apps).`);

console.log('\nSaving to Vercel (Production):');
for (const [name, value] of Object.entries(env)) {
  spawnSync('vercel', ['env', 'rm', name, 'production', '--yes'], { stdio: 'ignore' });
  const r = spawnSync('vercel', ['env', 'add', name, 'production'], { input: value, stdio: ['pipe', 'ignore', 'inherit'] });
  if (r.status !== 0) { console.error(`vercel env add ${name} failed`); process.exit(1); }
  console.log(`  ✓ ${name}`);
}
console.log('\nDone. Tell Claude, or redeploy production, so the dashboard picks it up.');
