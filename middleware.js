// Content negotiation for agents (acceptmarkdown.com). The six public pages serve
// Markdown from the *same* URL when the request asks for it, HTML otherwise, and 406
// when the client will accept neither.
//
// This can't live in vercel.json: `rewrites` are evaluated after the filesystem phase
// (index.html has already answered), and `redirects` can only match a header against a
// regex — they can't read q-values or answer 406. Routing Middleware runs before both.
//
// Only the six page paths are matched, so every other request — assets, the .md twins,
// llms.txt, sitemap.xml, the 404 — never invokes this.

/** URL path -> the markdown twin the build emits for it. */
export const TWIN = {
  '/': '/index.md',
  '/calculators': '/calculators.md',
  '/draws': '/draws.md',
  '/features': '/features.md',
  '/privacy': '/privacy.md',
  '/terms': '/terms.md',
};

// Vercel statically parses this export, so the matcher has to be a literal — it cannot
// be derived from TWIN. web/middleware.test.mjs asserts the two stay in step.
export const config = {
  matcher: ['/', '/calculators', '/draws', '/features', '/privacy', '/terms'],
};

/**
 * Quality value the Accept header assigns to one media type, per RFC 9110 §12.5.1:
 * the *most specific* matching media range wins, regardless of its q. Returns 0 when
 * no range matches (i.e. the type is not acceptable).
 */
export function qualityOf(accept, type) {
  const [wantType, wantSub] = type.split('/');
  let bestPrecedence = 0;
  let q = 0;
  for (const entry of accept.split(',')) {
    const [range, ...params] = entry.trim().split(';');
    const [rangeType, rangeSub] = range.trim().toLowerCase().split('/');
    const precedence =
      rangeType === wantType && rangeSub === wantSub ? 3
      : rangeType === wantType && rangeSub === '*' ? 2
      : rangeType === '*' && rangeSub === '*' ? 1
      : 0;
    if (precedence === 0 || precedence < bestPrecedence) continue;
    const qParam = params.map((p) => p.trim()).find((p) => p.toLowerCase().startsWith('q='));
    const parsed = qParam ? Number.parseFloat(qParam.slice(2)) : 1;
    bestPrecedence = precedence;
    q = Number.isNaN(parsed) ? 1 : Math.min(Math.max(parsed, 0), 1);
  }
  return q;
}

/** 'markdown' | 'html' | 'none' — which representation this Accept header asks for. */
export function chooseVariant(accept) {
  // No Accept header at all means "no preference": send the default representation.
  if (!accept || !accept.trim()) return 'html';
  const markdown = Math.max(qualityOf(accept, 'text/markdown'), qualityOf(accept, 'text/x-markdown'));
  const html = qualityOf(accept, 'text/html');
  if (markdown <= 0 && html <= 0) return 'none';
  return markdown > html ? 'markdown' : 'html';
}

const VARY = 'Accept, Accept-Encoding';

export default async function middleware(request) {
  try {
    return await negotiate(request);
  } catch {
    // Never let a malformed header turn a working page into a 500: fall through to the
    // static HTML, which is what a client that didn't ask for markdown would have got.
    return;
  }
}

async function negotiate(request) {
  const url = new URL(request.url);
  const twin = TWIN[url.pathname];
  if (!twin) return;

  switch (chooseVariant(request.headers.get('accept'))) {
    case 'html':
      return; // fall through to the static page; vercel.json adds Vary: Accept

    case 'markdown': {
      // ponytail: sub-request rather than a rewrite() import — the root has no
      // package.json to install @vercel/functions into. It is an edge->CDN hop on a
      // cached asset. Swap in rewrite() if a root workspace ever exists.
      const res = await fetch(new URL(twin, url), { headers: { accept: 'text/plain' } });
      if (!res.ok) return; // twin missing for any reason: serve the HTML rather than fail
      return new Response(res.body, {
        status: 200,
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Content-Disposition': 'inline',
          Vary: VARY,
        },
      });
    }

    default:
      return new Response(
        `406 Not Acceptable\n\n${url.pathname} is available as:\n` +
          `  text/html\n  text/markdown\n\n` +
          `Agent guidance: ${url.origin}/llms.txt\n`,
        { status: 406, headers: { 'Content-Type': 'text/plain; charset=utf-8', Vary: VARY } },
      );
  }
}
