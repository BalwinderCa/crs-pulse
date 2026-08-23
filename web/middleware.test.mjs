// The Accept parsing behind acceptmarkdown.com compliance. Lives here so `npm test`
// in web/ covers it; the middleware itself has to sit at the repo root for Vercel.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { qualityOf, chooseVariant, config, TWIN } from '../middleware.js';

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), 'public');

const BROWSER = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8';

test('qualityOf follows RFC 9110 precedence (most specific range wins)', () => {
  assert.equal(qualityOf('text/markdown', 'text/markdown'), 1);
  assert.equal(qualityOf('text/markdown;q=0.4', 'text/markdown'), 0.4);
  assert.equal(qualityOf('*/*', 'text/markdown'), 1);
  assert.equal(qualityOf('text/*;q=0.6', 'text/markdown'), 0.6);
  assert.equal(qualityOf('application/pdf', 'text/markdown'), 0, 'no matching range = not acceptable');
  // An exact range outranks a wildcard even when the wildcard scores higher.
  assert.equal(qualityOf('text/markdown;q=0.2, */*;q=0.9', 'text/markdown'), 0.2);
  assert.equal(qualityOf('*/*;q=0.9, text/markdown;q=0.2', 'text/markdown'), 0.2);
  // Malformed q values fall back to 1 rather than poisoning the comparison.
  assert.equal(qualityOf('text/markdown;q=bogus', 'text/markdown'), 1);
});

test('chooseVariant serves markdown only when it actually outranks HTML', () => {
  assert.equal(chooseVariant('text/markdown'), 'markdown');
  assert.equal(chooseVariant('text/x-markdown'), 'markdown');
  assert.equal(chooseVariant('text/markdown, text/plain;q=0.9, */*;q=0.8'), 'markdown');
  assert.equal(chooseVariant('text/markdown;q=0.9, text/html;q=0.5'), 'markdown');
});

test('chooseVariant leaves browsers and unspecific clients on HTML', () => {
  assert.equal(chooseVariant(BROWSER), 'html');
  assert.equal(chooseVariant('*/*'), 'html', 'curl default takes the default representation');
  assert.equal(chooseVariant(''), 'html');
  assert.equal(chooseVariant(null), 'html');
  assert.equal(chooseVariant('text/*'), 'html', 'a tie goes to the default representation');
  assert.equal(chooseVariant('text/markdown;q=0.3, text/html;q=0.8'), 'html');
  assert.equal(chooseVariant('text/markdown;q=0.5, text/html'), 'html');
});

test('chooseVariant reports 406 when neither representation is acceptable', () => {
  assert.equal(chooseVariant('application/pdf'), 'none');
  assert.equal(chooseVariant('text/markdown;q=0'), 'none', 'q=0 means explicitly unacceptable');
  assert.equal(chooseVariant('text/html;q=0, text/markdown;q=0'), 'none');
  assert.equal(chooseVariant('image/png, image/webp'), 'none');
});

test('the matcher covers every public page and nothing else', () => {
  assert.deepEqual(config.matcher, ['/', '/calculators', '/draws', '/features', '/privacy', '/terms']);
  // Matching a .md path would make the middleware fetch itself.
  assert.ok(!config.matcher.some((m) => m.endsWith('.md')));
});

test('every matched path has a twin the build actually emits', () => {
  assert.deepEqual(Object.keys(TWIN), config.matcher);
  for (const [path, twin] of Object.entries(TWIN)) {
    assert.ok(existsSync(resolve(OUT, twin.slice(1))), `${path} -> ${twin} is not in the build output`);
  }
});
