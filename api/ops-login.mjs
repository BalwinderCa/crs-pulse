import { COOKIE, SESSION_MS, makeSession, privateHeaders, verifyPassphrase, verifyTotp } from './_ops-auth.mjs';

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
  // Check both factors every time, so a failure doesn't say which one was wrong.
  const passOk = verifyPassphrase(body.passphrase, OPS_PASS_HASH);
  const codeOk = verifyTotp(OPS_TOTP_SECRET, String(body.code ?? '').replace(/\s/g, ''));
  if (!passOk || !codeOk) {
    await new Promise((r) => setTimeout(r, 1000));
    return res.status(401).json({ error: 'invalid' });
  }
  res.setHeader(
    'Set-Cookie',
    `${COOKIE}=${makeSession(OPS_SESSION_KEY)}; Path=/; Max-Age=${SESSION_MS / 1000}; HttpOnly; Secure; SameSite=Strict`,
  );
  return res.status(200).json({ ok: true });
}
