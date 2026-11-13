#!/usr/bin/env node
// One-time (or rotation) setup for the private dashboard at crspulse.com/pulse-hq.
//
//   node scripts/ops-setup.mjs
//
// Run it in your own terminal, not through Claude: it prints the authenticator setup key.
// It asks for a passphrase, creates a new TOTP secret and session key, checks a code from
// Google Authenticator, then stores OPS_PASS_HASH, OPS_TOTP_SECRET, OPS_SESSION_KEY and the
// PostHog read key (from .env.local) in
// the Vercel project's Production environment. Redeploy afterwards for them to take effect.
// Running it again rotates everything: the old authenticator entry and all sessions stop working.
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { hashPassphrase, verifyTotp } from '../api/_ops-auth.mjs';

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function base32Encode(buf) {
  let bits = 0, value = 0, out = '';
  for (const b of buf) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) { out += B32[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

function ask(question, hidden = false) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      rl._writeToOutput = (s) => { if (s.includes(question)) rl.output.write(s); };
    }
    rl.question(question, (a) => { rl.close(); if (hidden) process.stdout.write('\n'); resolve(a); });
  });
}

function setEnv(name, value) {
  spawnSync('vercel', ['env', 'rm', name, 'production', '--yes'], { stdio: 'ignore' });
  const r = spawnSync('vercel', ['env', 'add', name, 'production'], { input: value, stdio: ['pipe', 'ignore', 'inherit'] });
  if (r.status !== 0) throw new Error(`vercel env add ${name} failed`);
  console.log(`  ✓ ${name}`);
}

const who = spawnSync('vercel', ['whoami'], { encoding: 'utf8' }).stdout.trim();
if (who !== 'admin-73711109') {
  console.error(`Vercel CLI is logged in as "${who}". Log in as admin-73711109 first (vercel login).`);
  process.exit(1);
}

const pass = await ask('New passphrase (at least 16 characters): ', true);
if (pass.length < 16) { console.error('Too short.'); process.exit(1); }
if ((await ask('Repeat passphrase: ', true)) !== pass) { console.error('Passphrases differ.'); process.exit(1); }

const secret = base32Encode(randomBytes(20));
const uri = `otpauth://totp/CRS%20Pulse:Pulse%20HQ?secret=${secret}&issuer=CRS%20Pulse&algorithm=SHA1&digits=6&period=30`;
console.log('\nIn Google Authenticator: + → "Enter a setup key"');
console.log('  Account: Pulse HQ   Type: Time based');
console.log(`  Key:     ${secret.match(/.{1,4}/g).join(' ')}`);
console.log(`\n(otpauth URI, if your app takes one: ${uri})\n`);

for (let tries = 0; ; tries++) {
  const code = (await ask('Enter the 6-digit code it shows now: ')).replace(/\s/g, '');
  if (verifyTotp(secret, code)) break;
  if (tries >= 2) { console.error('Code did not match three times; nothing was saved.'); process.exit(1); }
  console.log('That code does not match; check the phone clock is set automatically, then try again.');
}

console.log('\nSaving to Vercel (Production):');
setEnv('OPS_PASS_HASH', hashPassphrase(pass, randomBytes(16)));
setEnv('OPS_TOTP_SECRET', secret);
setEnv('OPS_SESSION_KEY', randomBytes(32).toString('base64url'));
// The dashboard's PostHog read key, taken from the repo-root .env.local (never printed).
try {
  const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
  const key = env.match(/^POSTHOG_PERSONAL_API_KEY=(.*)$/m)?.[1]?.replace(/["']/g, '').trim();
  if (key) setEnv('POSTHOG_PERSONAL_API_KEY', key);
  else console.log('  ! POSTHOG_PERSONAL_API_KEY not in .env.local; add it with `vercel env add`.');
} catch {
  console.log('  ! No .env.local; add POSTHOG_PERSONAL_API_KEY with `vercel env add`.');
}
console.log('\nDone. Redeploy production (or push to main) so the new values take effect.');
