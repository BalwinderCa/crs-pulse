import { COOKIE, privateHeaders } from './_ops-auth.mjs';

export default function handler(req, res) {
  privateHeaders(res);
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method' });
  }
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`);
  return res.status(200).json({ ok: true });
}
