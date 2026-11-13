import {
  COOKIE, DEVICE_COOKIE, DEVICE_MS, SESSION_MS,
  cookie, isTrustedDevice, makeDevice, makeSession, privateHeaders, verifyPassphrase, verifyTotp,
} from './_ops-auth.mjs';

export default async function handler(req, res) {
  privateHeaders(res);
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method' });
  }
  const { OPS_TOTP_SECRET, OPS_PASS_HASH, OPS_SESSION_KEY } = process.env;
  if (!OPS_TOTP_SECRET || !OPS_PASS_HASH || !OPS_SESSION_KEY) {
    return res.status(503).json({ error: 'not configured' });
  }
  const body = typeof req.body === 'object' && req.body ? req.body : {};
  // A remembered device (signed cookie from an earlier full login) needs only the code.
  // Everywhere else both factors are checked every time, and a failure doesn't say which.
  const trusted = isTrustedDevice(req);
  const passOk = trusted || verifyPassphrase(body.passphrase, OPS_PASS_HASH);
  const codeOk = verifyTotp(OPS_TOTP_SECRET, String(body.code ?? '').replace(/\s/g, ''));
  if (!passOk || !codeOk) {
    await new Promise((r) => setTimeout(r, 1000));
    return res.status(401).json({ error: 'invalid', passphraseNeeded: !trusted });
  }
  const cookies = [cookie(COOKIE, makeSession(OPS_SESSION_KEY), SESSION_MS)];
  // Only a full login can mark a device; the 90 days are not extended by code-only logins.
  if (!trusted && body.remember === true) cookies.push(cookie(DEVICE_COOKIE, makeDevice(OPS_SESSION_KEY), DEVICE_MS));
  res.setHeader('Set-Cookie', cookies);
  return res.status(200).json({ ok: true });
}
