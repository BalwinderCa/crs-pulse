// Guards the machine-readable surface: the markdown twins agents get via
// `Accept: text/markdown`, the JSON-LD identity graph, sitemap/robots/llms.txt, and the
// 404. Also asserts vercel.json's redirects/headers still cover every route the build
// emits — the two files are edited independently, and a drift there silently serves HTML
// to an agent asking for markdown.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(here, 'public');
const SITE = 'https://www.crspulse.com';

// [url path, output basename] for every public page.
const ROUTES = [
  ['/', 'index'],
  ['/calculators', 'calculators'],
  ['/draws', 'draws'],
  ['/features', 'features'],
  ['/privacy', 'privacy'],
  ['/terms', 'terms'],
];

execFileSync(process.execPath, [resolve(here, 'build.mjs')], { stdio: 'ignore' });
const read = (f) => readFileSync(resolve(OUT, f), 'utf8');
const vercel = JSON.parse(readFileSync(resolve(here, '../vercel.json'), 'utf8'));

// "/:page(a|b)" and "/:page(a|b).md" cover several concrete paths; everything else is literal.
const expand = (source) => {
  const m = source.match(/^\/:[a-z]+\(([^)]*)\)(\.md)?$/i);
  return m ? m[1].split('|').map((seg) => `/${seg}${m[2] || ''}`) : [source];
};
const acceptRule = (rule) =>
  (rule.has || []).find((h) => h.type === 'header' && h.key.toLowerCase() === 'accept');

test('every route ships an HTML page and a markdown twin', () => {
  for (const [path, file] of ROUTES) {
    const html = read(`${file}.html`);
    assert.match(html, /<!doctype html>/, `${file}.html`);
    const md = read(`${file}.md`);
    assert.match(md, /^# \S/, `${file}.md must open with an H1`);
    assert.ok(md.length > 500, `${file}.md looks too thin to be useful (${md.length} bytes)`);
    assert.match(html, new RegExp(`<link rel="canonical" href="${SITE}${path === '/' ? '/' : path}">`));
    const twin = path === '/' ? '/index.md' : `${path}.md`;
    assert.match(html, new RegExp(`<link rel="alternate" type="text/markdown" href="${SITE}${twin}">`));
  }
});

test('homepage carries a parseable JSON-LD identity graph', () => {
  const m = read('index.html').match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(m, 'no JSON-LD block on the homepage');
  const graph = JSON.parse(m[1])['@graph'];
  const types = graph.flatMap((n) => [n['@type']].flat());
  for (const t of ['SoftwareApplication', 'Organization', 'WebSite', 'FAQPage']) {
    assert.ok(types.includes(t), `JSON-LD is missing a ${t} node`);
  }
  const app = graph.find((n) => [n['@type']].flat().includes('SoftwareApplication'));
  for (const field of ['name', 'description', 'url', 'offers']) {
    assert.ok(app[field], `SoftwareApplication is missing ${field}`);
  }
  const faq = graph.find((n) => n['@type'] === 'FAQPage');
  assert.ok(faq.mainEntity.length >= 5);
  assert.ok(faq.mainEntity.every((q) => q.name && q.acceptedAnswer.text));
});

test('sitemap.xml lists every route with a lastmod', () => {
  const xml = read('sitemap.xml');
  assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  assert.match(xml, /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  assert.deepEqual(locs, ROUTES.map(([path]) => `${SITE}${path}`));
  assert.equal([...xml.matchAll(/<lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod>/g)].length, ROUTES.length);
  // Unescaped ampersands are the classic way a sitemap stops parsing.
  assert.doesNotMatch(xml, /&(?!amp;|lt;|gt;|quot;|apos;)/);
});

test('robots.txt points at the sitemap and the agent guide', () => {
  const txt = read('robots.txt');
  assert.match(txt, /^User-agent: \*$/m);
  assert.match(txt, /^Allow: \/$/m);
  assert.match(txt, new RegExp(`^Sitemap: ${SITE}/sitemap\\.xml$`, 'm'));
  assert.ok(txt.includes(`${SITE}/llms.txt`));
});

test('llms.txt follows llmstxt.org and says when to use the site', () => {
  const txt = read('llms.txt');
  assert.match(txt, /^# CRS Pulse\n/);
  assert.match(txt, /\n> /, 'needs a blockquote summary');
  assert.match(txt, /^## When to use this$/m);
  assert.match(txt, /^## When not to use this$/m);
  assert.ok(txt.includes('Accept: text/markdown'), 'must tell an agent how to call the site');
  for (const [path, file] of ROUTES) {
    assert.ok(txt.includes(`${SITE}/${file}.md`), `llms.txt does not link ${path}`);
  }
});

test('404 page is a recoverable site map, not a dead end', () => {
  const html = read('404.html');
  assert.match(html, /<meta name="robots" content="noindex, follow">/);
  assert.doesNotMatch(html, /rel="canonical"/, 'a 404 has no canonical URL');
  // The markdown recovery block: every route plus the two machine-readable entry points.
  for (const [, file] of ROUTES) assert.ok(html.includes(`${SITE}/${file}.md`), `404 omits ${file}.md`);
  assert.ok(html.includes(`${SITE}/sitemap.xml`));
  assert.ok(html.includes(`${SITE}/llms.txt`));
  assert.match(html, /# 404 — page not found/, 'needs the markdown body agents read');
});

// Negotiation lives in the root middleware (see web/middleware.test.mjs): it is the only
// layer that can read q-values and answer 406. vercel.json must not also try — a rewrite
// never fires for a path that exists on disk, and a redirect would pre-empt the
// middleware and give up the same-URL property.
test('vercel.json leaves negotiation to the middleware', () => {
  assert.ok(!vercel.rewrites, 'rewrites never fire for paths that exist on disk');
  const stale = (vercel.redirects || []).filter(acceptRule);
  assert.deepEqual(stale, [], 'Accept-based redirects would pre-empt the middleware');
});

test('vercel.json sets Vary: Accept on both variants of every route', () => {
  const varyOn = new Set();
  const typeOn = new Map();
  for (const h of vercel.headers) {
    for (const path of expand(h.source)) {
      for (const { key, value } of h.headers) {
        if (key.toLowerCase() === 'vary' && /\baccept\b/i.test(value)) varyOn.add(path);
        if (key.toLowerCase() === 'content-type') typeOn.set(path, value);
      }
    }
  }
  for (const [path, file] of ROUTES) {
    assert.ok(varyOn.has(path), `${path} is negotiated but does not send Vary: Accept`);
    assert.ok(varyOn.has(`/${file}.md`), `/${file}.md does not send Vary: Accept`);
    assert.equal(typeOn.get(`/${file}.md`), 'text/markdown; charset=utf-8', `/${file}.md content type`);
  }
  assert.equal(typeOn.get('/llms.txt'), 'text/markdown; charset=utf-8');
});
