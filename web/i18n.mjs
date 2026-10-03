// Site language for this build. `npm run build` runs build.mjs twice: once in English
// into web/public/, then with CRS_LANG=fr into web/public/fr/.
//
// T() is keyed by the English source text. In the English build it returns the text
// unchanged. In the French build it looks the text up in web/i18n/fr/*.json, and when a
// string has no translation it falls back to English and records it, so a gap is visible
// (web/public/fr/_i18n-missing.json, enforced by web/i18n.test.mjs) rather than silent.
//
// Interpolate with {name} placeholders, never ${…} inside the key, so the key doesn't
// change with the data: T('Round #{n} on {date}', { n: r.number, date }).
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const LANG = process.env.CRS_LANG === 'fr' ? 'fr' : 'en';
export const LOCALE = LANG === 'fr' ? 'fr-CA' : 'en-CA';
export const HTML_LANG = LANG === 'fr' ? 'fr-CA' : 'en';

const DICT = {};
const DICT_DIR = resolve(here, 'i18n/fr');
if (LANG === 'fr' && existsSync(DICT_DIR)) {
  for (const f of readdirSync(DICT_DIR).filter((n) => n.endsWith('.json')).sort()) {
    const entries = JSON.parse(readFileSync(resolve(DICT_DIR, f), 'utf8'));
    for (const [k, v] of Object.entries(entries)) {
      if (k in DICT && DICT[k] !== v) throw new Error(`i18n: "${k.slice(0, 60)}" translated differently in ${f}`);
      DICT[k] = v;
    }
  }
}

/** Source strings the French build asked for and found no translation. */
export const MISSING = new Set();

export function T(source, vars) {
  let out = source;
  if (LANG === 'fr') {
    const hit = DICT[source];
    if (hit == null || hit === '') MISSING.add(source);
    else out = hit;
  }
  return vars ? out.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : out;
}
