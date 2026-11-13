// Login for the private ops dashboard (/pulse-hq). Two factors: a passphrase (scrypt hash
// in OPS_PASS_HASH) and a Google Authenticator code (TOTP, RFC 6238: SHA-1, 6 digits, 30 s,
// ±1 step, secret in OPS_TOTP_SECRET). A remembered device (DEVICE_COOKIE) needs only the code.
// The passphrase is what makes a stateless function safe: a 6-digit code alone can be
// brute-forced in about an hour of scripted requests, because nothing here keeps a counter.
// A good login gets an HMAC-signed session cookie (OPS_SESSION_KEY) valid for 12 hours.
import { createHmac, scryptSync, timingSafeEqual } from 'node:crypto';

export const COOKIE = '__Host-ops';
export const SESSION_MS = 12 * 60 * 60 * 1000;
// "Remember this device": after one full login, this browser may sign in with the code
// alone for 90 days. A stranger guessing codes still has no device cookie, so they still
// need the passphrase. Signed with OPS_SESSION_KEY, so rerunning scripts/ops-setup.mjs
// (which replaces that key) forgets every device at once.
export const DEVICE_COOKIE = '__Host-ops-device';
export const DEVICE_MS = 90 * 24 * 60 * 60 * 1000;

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Decode(input) {
  const clean = String(input).toUpperCase().replace(/[\s=-]/g, '');
  let bits = 0;
  let value = 0;
  const out = [];
  for (const ch of clean) {
    const idx = B32.indexOf(ch);
    if (idx < 0) throw new Error('invalid base32');
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** RFC 4226 HOTP, truncated to `digits`. */
export function hotp(key, counter, digits = 6) {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const mac = createHmac('sha1', key).update(msg).digest();
  const off = mac[mac.length - 1] & 0x0f;
  const bin = ((mac[off] & 0x7f) << 24) | (mac[off + 1] << 16) | (mac[off + 2] << 8) | mac[off + 3];
  return String(bin % 10 ** digits).padStart(digits, '0');
}

export function verifyTotp(secretB32, code, nowMs = Date.now()) {
  if (!secretB32 || !/^\d{6}$/.test(String(code ?? ''))) return false;
  const key = base32Decode(secretB32);
  const step = Math.floor(nowMs / 1000 / 30);
  let ok = false;
  for (const w of [-1, 0, 1]) {
    const expected = Buffer.from(hotp(key, step + w));
    // No early exit, so timing doesn't reveal which window matched.
    if (timingSafeEqual(expected, Buffer.from(String(code)))) ok = true;
  }
  return ok;
}

/** OPS_PASS_HASH format: `scrypt$<salt hex>$<32-byte hash hex>` (N=16384, r=8, p=1). */
export function hashPassphrase(pass, salt) {
  return `scrypt$${salt.toString('hex')}$${scryptSync(pass, salt, 32).toString('hex')}`;
}

export function verifyPassphrase(pass, stored) {
  if (typeof pass !== 'string' || !pass || !stored) return false;
  const [kind, saltHex, hashHex] = stored.split('$');
  if (kind !== 'scrypt' || !saltHex || !hashHex) return false;
  const want = Buffer.from(hashHex, 'hex');
  const got = scryptSync(pass, Buffer.from(saltHex, 'hex'), want.length);
  return timingSafeEqual(want, got);
}

const sign = (key, payload) => createHmac('sha256', key).update(payload).digest('base64url');

// Token: `<kind>.<expiry ms>.<HMAC of "<kind>.<expiry>">`. The kind is signed too, so a
// session token can't be replayed as a device token or the other way round.
export function makeToken(key, kind, ttlMs, nowMs = Date.now()) {
  const payload = `${kind}.${nowMs + ttlMs}`;
  return `${payload}.${sign(key, payload)}`;
}

export function validToken(token, key, kind, nowMs = Date.now()) {
  if (!token || !key) return false;
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== kind) return false;
  const payload = `${parts[0]}.${parts[1]}`;
  const want = Buffer.from(sign(key, payload));
  const got = Buffer.from(parts[2]);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return false;
  return Number(parts[1]) > nowMs;
}

export const makeSession = (key, nowMs) => makeToken(key, 'v1', SESSION_MS, nowMs);
export const validSession = (token, key, nowMs) => validToken(token, key, 'v1', nowMs);
export const makeDevice = (key, nowMs) => makeToken(key, 'd1', DEVICE_MS, nowMs);
export const validDevice = (token, key, nowMs) => validToken(token, key, 'd1', nowMs);

export function readCookie(header, name) {
  for (const part of String(header ?? '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return null;
}

export const isAuthed = (req) =>
  validSession(readCookie(req.headers.cookie, COOKIE), process.env.OPS_SESSION_KEY);
export const isTrustedDevice = (req) =>
  validDevice(readCookie(req.headers.cookie, DEVICE_COOKIE), process.env.OPS_SESSION_KEY);

export const cookie = (name, value, maxAgeMs) =>
  `${name}=${value}; Path=/; Max-Age=${Math.floor(maxAgeMs / 1000)}; HttpOnly; Secure; SameSite=Strict`;

/** Every ops response is private, uncached and kept out of search. */
export function privateHeaders(res) {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'DENY');
}
