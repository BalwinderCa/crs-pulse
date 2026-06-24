// Renders the repo's legal markdown (docs/*.md) into clean, standalone HTML in
// web/public/. docs/*.md stays the single source of truth; Vercel runs this on
// every deploy, so editing the policy and pushing republishes the site.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';

const here = dirname(fileURLToPath(import.meta.url));
const DOCS = resolve(here, '../docs');
const OUT = resolve(here, 'public');

const slug = (s) =>
  s
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/&[a-z]+;/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

// Give h2–h6 stable ids so in-document anchor links (e.g. #advertising) resolve.
const addHeadingIds = (html) =>
  html.replace(/<(h[2-6])>(.*?)<\/\1>/g, (_m, tag, inner) => `<${tag} id="${slug(inner)}">${inner}</${tag}>`);

function page(title, bodyHtml, { isHome = false } = {}) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="index, follow">
<title>${title} — CRS Pulse</title>
<meta name="description" content="${title} for CRS Pulse — the Express Entry CRS calculator and IRCC draw tracker.">
<style>
  :root { --navy:#0A1628; --blue:#1A6DFF; --ink:#1b2330; --muted:#5b6676; --line:#e6e9ef; --bg:#f7f8fb; }
  * { box-sizing: border-box; }
  html { -webkit-text-size-adjust: 100%; }
  body { margin:0; background:var(--bg); color:var(--ink);
    font:16px/1.65 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; }
  a { color:var(--blue); text-decoration:none; }
  a:hover { text-decoration:underline; }
  header.site { background:var(--navy); color:#fff; }
  header.site .bar { max-width:760px; margin:0 auto; padding:16px 20px; display:flex; align-items:center; justify-content:space-between; gap:16px; }
  header.site .brand { font-weight:700; letter-spacing:.2px; color:#fff; }
  header.site nav a { color:#cdd7ea; margin-left:18px; font-size:14px; }
  header.site nav a:hover { color:#fff; }
  main { max-width:760px; margin:0 auto; padding:32px 20px 8px; }
  .card { background:#fff; border:1px solid var(--line); border-radius:14px; padding:28px 28px 32px;
    box-shadow:0 1px 2px rgba(16,30,60,.04); }
  h1 { font-size:1.7rem; line-height:1.25; margin:.2em 0 .6em; }
  h2 { font-size:1.2rem; margin:1.8em 0 .5em; padding-top:.2em; }
  h3 { font-size:1.02rem; margin:1.4em 0 .4em; }
  hr { border:0; border-top:1px solid var(--line); margin:2em 0; }
  code { background:#eef1f6; padding:.1em .35em; border-radius:5px; font-size:.9em; }
  ul, ol { padding-left:1.3em; }
  li { margin:.25em 0; }
  blockquote { margin:1em 0; padding:.5em 1em; border-left:3px solid var(--blue); background:#f0f5ff; color:var(--muted); }
  .home-links { list-style:none; padding:0; }
  .home-links li { margin:.6em 0; }
  .home-links a { font-weight:600; }
  footer { max-width:760px; margin:0 auto; padding:24px 20px 48px; color:var(--muted); font-size:13px; }
  footer a { color:var(--muted); text-decoration:underline; }
</style>
</head>
<body>
<header class="site">
  <div class="bar">
    <span class="brand">CRS Pulse</span>
    <nav><a href="/privacy">Privacy</a><a href="/terms">Terms</a></nav>
  </div>
</header>
<main>
  <article class="card">
${bodyHtml}
  </article>
</main>
<footer>
  ${isHome ? '' : '<a href="/">← Back</a> · '}CRS Pulse · Contact: <a href="mailto:contact@crspulse.com">contact@crspulse.com</a>
</footer>
</body>
</html>
`;
}

function renderDoc(mdFile, title) {
  const md = readFileSync(resolve(DOCS, mdFile), 'utf8');
  return page(title, addHeadingIds(marked.parse(md)), {});
}

mkdirSync(OUT, { recursive: true });

writeFileSync(resolve(OUT, 'privacy.html'), renderDoc('PRIVACY_POLICY.md', 'Privacy Policy'));
writeFileSync(resolve(OUT, 'terms.html'), renderDoc('TERMS_OF_USE.md', 'Terms of Use'));
writeFileSync(
  resolve(OUT, 'index.html'),
  page(
    'Legal',
    `<h1>CRS Pulse — Legal</h1>
<p>CRS Pulse is a local-first Express Entry CRS calculator and IRCC draw tracker. Your profile data stays on your device.</p>
<ul class="home-links">
  <li><a href="/privacy">Privacy Policy →</a></li>
  <li><a href="/terms">Terms of Use →</a></li>
</ul>`,
    { isHome: true },
  ),
);

console.log('Built privacy.html, terms.html, index.html → web/public/');
