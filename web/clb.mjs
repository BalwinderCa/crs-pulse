// Language test → CLB/NCLC conversion, shared by the guides (tables) and the
// in-browser calculators (live conversion). Mirrors toCLB() in
// mobile/src/features/onboarding/utils/crsCalculator.ts; change both together.

export const SKILLS = ['speaking', 'listening', 'reading', 'writing'];

// Minimum score for each CLB level per ability, in [reading, writing, listening,
// speaking] order (the order IRCC's equivalency charts use).
export const CLB_LEVELS = [10, 9, 8, 7, 6, 5, 4];
export const TESTS = {
  ielts: {
    name: 'IELTS General Training', short: 'IELTS', lang: 'en',
    scale: 'band scores from 0 to 9', range: { min: 0, max: 9, step: 0.5 },
    min: {
      10: ['8.0', '7.5', '8.5', '7.5'], 9: ['7.0', '7.0', '8.0', '7.0'], 8: ['6.5', '6.5', '7.5', '6.5'],
      7: ['6.0', '6.0', '6.0', '6.0'], 6: ['5.0', '5.5', '5.5', '5.5'], 5: ['4.0', '5.0', '5.0', '5.0'], 4: ['3.5', '4.0', '4.5', '4.0'],
    },
  },
  celpip: { name: 'CELPIP-General', short: 'CELPIP', lang: 'en', scale: 'levels 1 to 12', range: { min: 1, max: 12, step: 1 }, direct: true },
  pte: {
    name: 'PTE Core', short: 'PTE Core', lang: 'en',
    scale: 'scores from 10 to 90', range: { min: 10, max: 90, step: 1 },
    min: {
      10: [88, 90, 89, 89], 9: [78, 88, 82, 84], 8: [69, 79, 71, 76], 7: [60, 69, 60, 68],
      6: [51, 60, 50, 59], 5: [42, 51, 39, 51], 4: [33, 41, 28, 42],
    },
  },
  clb: { name: 'I know my CLB levels (English)', short: 'CLB', lang: 'en', scale: 'CLB levels', range: { min: 0, max: 12, step: 1 }, direct: true },
  tef: {
    name: 'TEF Canada (from Dec 10, 2023)', short: 'TEF Canada', lang: 'fr',
    scale: 'scores from 0 to 699', range: { min: 0, max: 699, step: 1 },
    min: {
      10: [546, 558, 546, 556], 9: [503, 512, 503, 518], 8: [462, 472, 462, 494], 7: [434, 428, 434, 456],
      6: [393, 379, 393, 422], 5: [352, 330, 352, 387], 4: [306, 268, 306, 328],
    },
  },
  tcf: {
    name: 'TCF Canada', short: 'TCF Canada', lang: 'fr',
    scale: 'reading and listening from 0 to 699, writing and speaking from 0 to 20',
    range: { min: 0, max: 699, step: 1, small: { writing: 20, speaking: 20 } },
    min: {
      10: [549, 16, 549, 16], 9: [524, 14, 523, 14], 8: [499, 12, 503, 12], 7: [453, 10, 458, 10],
      6: [406, 7, 398, 7], 5: [375, 6, 369, 6], 4: [342, 4, 331, 4],
    },
  },
  nclc: { name: 'I know my NCLC levels (French)', short: 'NCLC', lang: 'fr', scale: 'NCLC levels', range: { min: 0, max: 12, step: 1 }, direct: true },
};

const COL = { reading: 0, writing: 1, listening: 2, speaking: 3 };

/** CLB level (0 when below CLB 4 or missing) for one ability's raw score. */
export function toClb(testKey, skill, raw) {
  const t = TESTS[testKey];
  const n = raw === '' || raw == null ? NaN : Number(raw);
  if (!t || !Number.isFinite(n)) return 0;
  if (t.direct) { const c = Math.min(12, Math.max(0, Math.round(n))); return c >= 4 ? c : 0; }
  for (const lvl of CLB_LEVELS) if (n >= Number(t.min[lvl][COL[skill]])) return lvl;
  return 0;
}

// The same converter for the browser: data inlined, no imports.
export const CLB_CLIENT_SRC = `
  var CLB_TESTS = ${JSON.stringify(Object.fromEntries(Object.entries(TESTS).map(([k, t]) => [k, { short: t.short, lang: t.lang, range: t.range, direct: !!t.direct, min: t.min || null }])))};
  var CLB_COL = ${JSON.stringify(COL)};
  function toClb(testKey, skill, raw){
    var t = CLB_TESTS[testKey]; var n = (raw===''||raw==null) ? NaN : Number(raw);
    if (!t || !isFinite(n)) return 0;
    if (t.direct){ var c = Math.min(12, Math.max(0, Math.round(n))); return c>=4 ? c : 0; }
    var L = [10,9,8,7,6,5,4];
    for (var i=0;i<L.length;i++){ if (n >= Number(t.min[L[i]][CLB_COL[skill]])) return L[i]; }
    return 0;
  }
`;
