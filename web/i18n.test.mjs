// The French site (CRS_LANG=fr → web/public/fr/): every English page has a French
// twin at its French path, the two point at each other with hreflang, French pages link
// to French pages, and nothing fell back to English.
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';
import { FR_PAGES, toFr } from './i18n/routes.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const PUB = resolve(here, 'public');
const SITE = 'https://www.crspulse.com';

execFileSync(process.execPath, [resolve(here, 'build.mjs')], { stdio: 'ignore' });
execFileSync(process.execPath, [resolve(here, 'build.mjs')], { stdio: 'ignore', env: { ...process.env, CRS_LANG: 'fr' } });
const read = (p) => readFileSync(resolve(PUB, p), 'utf8');
const enFile = (path) => (path === '/' ? 'index.html' : `${path.slice(1)}.html`);
const frFile = (path) => `${toFr(path).slice(1)}.html`;
const drawPaths = readdirSync(resolve(PUB, 'draws')).map((f) => `/draws/${f.replace(/\.html$/, '')}`);
const ALL = [...Object.keys(FR_PAGES), ...drawPaths];

test('every English page has a French twin with matching hreflang', () => {
  for (const path of ALL) {
    assert.ok(existsSync(resolve(PUB, frFile(path))), `${path} has no French page at ${toFr(path)}`);
    const en = read(enFile(path));
    const fr = read(frFile(path));
    assert.match(fr, /<html lang="fr-CA"/, `${toFr(path)} lang`);
    assert.match(fr, new RegExp(`<link rel="canonical" href="${SITE}${toFr(path)}">`), `${toFr(path)} canonical`);
    for (const html of [en, fr]) {
      assert.ok(html.includes(`<link rel="alternate" hreflang="en-CA" href="${SITE}${path}">`), `${path} hreflang en`);
      assert.ok(html.includes(`<link rel="alternate" hreflang="fr-CA" href="${SITE}${toFr(path)}">`), `${path} hreflang fr`);
    }
    assert.doesNotMatch(fr, /type="text\/markdown"/, `${toFr(path)} must not advertise a markdown twin`);
  }
});

test('French pages link to French pages', () => {
  for (const path of ALL) {
    const fr = read(frFile(path));
    for (const [, href] of fr.matchAll(/href="(\/[^"]*)"/g)) {
      if (/^\/(img|js|fonts|favicon|apple-touch-icon)\b/.test(href)) continue;
      assert.ok(href === '/fr' || href.startsWith('/fr/') || href.startsWith('/fr#'), `${toFr(path)} links to English ${href}`);
    }
  }
});

test('the French sitemap lists every French page', () => {
  const xml = read('sitemap-fr.xml');
  const locs = new Set([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]));
  for (const path of ALL) assert.ok(locs.has(`${SITE}${toFr(path)}`), `sitemap-fr.xml lacks ${toFr(path)}`);
  assert.match(read('robots.txt'), /^Sitemap: https:\/\/www\.crspulse\.com\/sitemap-fr\.xml$/m);
});

test('nothing in the French build fell back to English', () => {
  const missing = JSON.parse(read('fr/_i18n-missing.json'));
  assert.deepEqual(missing.slice(0, 20), [], `${missing.length} untranslated strings, e.g. the ones listed`);
});

// T() only catches strings that go through it. Prose that bypasses it (a guide's
// markdown, data from the app) would render in English on /fr without tripping the test
// above, so also scan each French page's visible text for English sentences. The privacy
// policy and terms are deliberately English-only legal text.
const ENGLISH_ONLY = new Set(['/privacy', '/terms']);
const ENGLISH_WORDS = /\b(the|and|your|with|which|you|this|for)\b/gi;
test('French pages have no English sentences', () => {
  for (const path of ALL.filter((p) => !ENGLISH_ONLY.has(p))) {
    const text = read(frFile(path)).replace(/<(script|style)[\s\S]*?<\/\1>/g, '').replace(/<[^>]+>/g, '\n');
    const english = text.split('\n').filter((line) => (line.match(ENGLISH_WORDS) ?? []).length >= 2);
    assert.deepEqual(english.slice(0, 3), [], `${toFr(path)} has English text`);
  }
});
