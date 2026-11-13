import { COOKIE, DEVICE_COOKIE, cookie, privateHeaders } from './_ops-auth.mjs';

// POST ends the session. With {"forget": true} it also forgets this device, so the next
// login here asks for the passphrase again.
export default function handler(req, res) {
  privateHeaders(res);
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method' });
  }
  const forget = typeof req.body === 'object' && req.body?.forget === true;
  const cookies = [cookie(COOKIE, '', 0)];
  if (forget) cookies.push(cookie(DEVICE_COOKIE, '', 0));
  res.setHeader('Set-Cookie', cookies);
  return res.status(200).json({ ok: true });
}
