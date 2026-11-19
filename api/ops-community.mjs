// Community timelines for the ops dashboard: a signed-in proxy to the push worker's
// /admin/community routes, which need SYNC_SECRET (ops-only, never shipped in the app).
// The session cookie is SameSite=Strict, so another site can't drive these writes.
//
//   GET    /api/ops-community?q=&status=&offset=&program=&aor=&stage=&sort=   list
//   GET    /api/ops-community?stats=1                 counts for the Community dashboard
//   GET    /api/ops-community?random=1                a generated display name + avatar
//   POST   /api/ops-community                         create
//   PATCH  /api/ops-community?id=<id>                 edit / hide / unhide
//   DELETE /api/ops-community?id=<id>                 delete
//   GET    /api/ops-community?id=<id>&reports=1       its reports
//   DELETE /api/ops-community?id=<id>&reports=1       dismiss its reports
import { isAuthed, privateHeaders } from './_ops-auth.mjs';

const WORKER = 'https://crs-pulse-push.balwinderxcode.workers.dev';
const ID_RE = /^[0-9a-f-]{36}$/;

/** The worker URL for this request, or null when it isn't one we forward. */
export function workerPath(method, query) {
  const id = query.id;
  if (id !== undefined && !ID_RE.test(String(id))) return null;
  if (!id) {
    if (query.stats) return method === 'GET' ? '/admin/community/stats' : null;
    if (query.random) return method === 'GET' ? '/admin/community/random' : null;
    if (method === 'GET') {
      const qs = new URLSearchParams();
      for (const k of ['q', 'status', 'offset', 'limit', 'program', 'aor', 'stage', 'sort']) if (query[k]) qs.set(k, String(query[k]));
      return `/admin/community?${qs}`;
    }
    return method === 'POST' ? '/admin/community' : null;
  }
  if (query.reports) return method === 'GET' || method === 'DELETE' ? `/admin/community/${id}/reports` : null;
  return method === 'PATCH' || method === 'DELETE' ? `/admin/community/${id}` : null;
}

export default async function handler(req, res) {
  privateHeaders(res);
  if (!isAuthed(req)) return res.status(401).json({ error: 'auth' });
  if (!process.env.SYNC_SECRET) return res.status(503).json({ error: 'SYNC_SECRET is not set on Vercel' });
  const path = workerPath(req.method, req.query ?? {});
  if (!path) return res.status(404).json({ error: 'not found' });

  const r = await fetch(`${WORKER}${path}`, {
    method: req.method,
    headers: { Authorization: `Bearer ${process.env.SYNC_SECRET}`, 'Content-Type': 'application/json' },
    ...(req.method === 'POST' || req.method === 'PATCH' ? { body: JSON.stringify(req.body ?? {}) } : {}),
  }).catch(() => null);
  if (!r) return res.status(502).json({ error: 'worker unreachable' });
  if (r.status === 204) return res.status(204).end();
  const body = await r.json().catch(() => ({}));
  return res.status(r.status).json(r.ok ? body : { error: body.message || `worker ${r.status}` });
}
