// Login for the private ops dashboard (/pulse-hq). Two factors, both checked on every
// login: a passphrase (scrypt hash in OPS_PASS_HASH) and a Google Authenticator code
// (TOTP, RFC 6238: SHA-1, 6 digits, 30 s, ±1 step, secret in OPS_TOTP_SECRET).
// The passphrase is what makes a stateless function safe: a 6-digit code alone can be
// brute-forced in about an hour of scripted requests, because nothing here keeps a counter.
// A good login gets an HMAC-signed session cookie (OPS_SESSION_KEY) valid for 12 hours.
import { createHmac, scryptSync, timingSafeEqual } from 'node:crypto';

export const COOKIE = '__Host-ops';
export const SESSION_MS = 12 * 60 * 60 * 1000;

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

export function makeSession(key, nowMs = Date.now()) {
  const payload = `v1.${nowMs + SESSION_MS}`;
  return `${payload}.${sign(key, payload)}`;
}

export function validSession(token, key, nowMs = Date.now()) {
  if (!token || !key) return false;
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== 'v1') return false;
  const payload = `${parts[0]}.${parts[1]}`;
  const want = Buffer.from(sign(key, payload));
  const got = Buffer.from(parts[2]);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return false;
  return Number(parts[1]) > nowMs;
}

export function readCookie(header, name) {
  for (const part of String(header ?? '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return null;
}

export const isAuthed = (req) =>
  validSession(readCookie(req.headers.cookie, COOKIE), process.env.OPS_SESSION_KEY);

/** Every ops response is private, uncached and kept out of search. */
export function privateHeaders(res) {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'DENY');
}
