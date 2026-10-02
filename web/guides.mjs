// Long-form guides and the About page. Each entry renders to an HTML page (through
// build.mjs's guide shell) and doubles as that page's markdown twin.
//
// Every number in these pages comes from data, not prose: the CRS figures from the same
// `crsCalc` the in-browser calculator runs, the FSW grid and CLB thresholds from tables
// mirrored from mobile/src/features/*/utils, and the draw figures from data/ee-rounds.json.
// If IRCC changes a grid, fix the table here (and in the app) and every guide follows.

// Date the guide copy was last checked against canada.ca. Bump it when you re-review,
// not on every build: it is the Article's dateModified.
export const GUIDES_REVIEWED = '2026-10-02';

const IRCC = 'https://www.canada.ca/en/immigration-refugees-citizenship';
const LINKS = {
  crsGrid: `${IRCC}/services/immigrate-canada/express-entry/check-score/crs-criteria.html`,
  eeRounds: `${IRCC}/services/immigrate-canada/express-entry/rounds-invitations.html`,
  eeEligibility: `${IRCC}/services/immigrate-canada/express-entry/who-can-apply.html`,
  fswFactors: `${IRCC}/services/immigrate-canada/express-entry/who-can-apply/federal-skilled-workers/six-selection-factors-federal-skilled-workers.html`,
  langTests: `${IRCC}/services/immigrate-canada/express-entry/documents/language-requirements/language-testing.html`,
  funds: `${IRCC}/services/immigrate-canada/express-entry/documents/proof-funds.html`,
  categories: `${IRCC}/services/immigrate-canada/express-entry/rounds-invitations/category-based-selection.html`,
};

const fmt = (n) => Number(n).toLocaleString('en-CA');
const table = (head, rows) =>
  [`| ${head.join(' | ')} |`, `| ${head.map(() => '---').join(' | ')} |`, ...rows.map((r) => `| ${r.join(' | ')} |`)].join('\n');

// ---------------------------------------------------------------- CRS tables
// Mirrors mobile/src/features/onboarding/utils/crsCalculator.ts.
const AGE_ROWS = [
  ['17 or under', 0, 0], ['18', 99, 90], ['19', 105, 95], ['20 to 29', 110, 100], ['30', 105, 95],
  ['31', 99, 90], ['32', 94, 85], ['33', 88, 80], ['34', 83, 75], ['35', 77, 70], ['36', 72, 65],
  ['37', 66, 60], ['38', 61, 55], ['39', 55, 50], ['40', 50, 45], ['41', 39, 35], ['42', 28, 25],
  ['43', 17, 15], ['44', 6, 5], ['45 or older', 0, 0],
];
const EDU_ROWS = [
  ['Less than secondary school', 0, 0, 0],
  ['Secondary diploma (high school)', 30, 28, 2],
  ['One-year post-secondary program', 90, 84, 6],
  ['Two-year post-secondary program', 98, 91, 7],
  ["Bachelor's degree, or a program of three years or more", 120, 112, 8],
  ['Two or more credentials, one of them three years or longer', 128, 119, 9],
  ["Master's degree, or a professional degree needed to practise a licensed profession", 135, 126, 10],
  ['Doctoral degree (PhD)', 150, 140, 10],
];
const FIRST_LANG_ROWS = [
  ['CLB 4 or 5', 6, 6], ['CLB 6', 9, 8], ['CLB 7', 17, 16], ['CLB 8', 23, 22], ['CLB 9', 31, 29], ['CLB 10 or more', 34, 32],
];
const CWE_ROWS = [['None or less than a year', 0, 0, 0], ['1 year', 40, 35, 5], ['2 years', 53, 46, 7], ['3 years', 64, 56, 8], ['4 years', 72, 63, 9], ['5 years or more', 80, 70, 10]];

// ---------------------------------------------------------------- CLB tables
// Minimum score for each CLB level, per ability: [reading, writing, listening, speaking].
// Mirrors toCLB() in crsCalculator.ts (IRCC equivalency charts).
const CLB_LEVELS = [10, 9, 8, 7, 6, 5, 4];
const TESTS = {
  ielts: {
    name: 'IELTS General Training',
    scale: 'band scores from 0 to 9',
    min: {
      10: ['8.0', '7.5', '8.5', '7.5'], 9: ['7.0', '7.0', '8.0', '7.0'], 8: ['6.5', '6.5', '7.5', '6.5'],
      7: ['6.0', '6.0', '6.0', '6.0'], 6: ['5.0', '5.5', '5.5', '5.5'], 5: ['4.0', '5.0', '5.0', '5.0'], 4: ['3.5', '4.0', '4.5', '4.0'],
    },
  },
  pte: {
    name: 'PTE Core',
    scale: 'scores from 10 to 90',
    min: {
      10: [88, 90, 89, 89], 9: [78, 88, 82, 84], 8: [69, 79, 71, 76], 7: [60, 69, 60, 68],
      6: [51, 60, 50, 59], 5: [42, 51, 39, 51], 4: [33, 41, 28, 42],
    },
  },
  tef: {
    name: 'TEF Canada (tests taken from December 10, 2023)',
    scale: 'scores from 0 to 699',
    min: {
      10: [546, 558, 546, 556], 9: [503, 512, 503, 518], 8: [462, 472, 462, 494], 7: [434, 428, 434, 456],
      6: [393, 379, 393, 422], 5: [352, 330, 352, 387], 4: [306, 268, 306, 328],
    },
  },
  tcf: {
    name: 'TCF Canada',
    scale: 'reading and listening from 0 to 699, writing and speaking from 0 to 20',
    min: {
      10: [549, 16, 549, 16], 9: [524, 14, 523, 14], 8: [499, 12, 503, 12], 7: [453, 10, 458, 10],
      6: [406, 7, 398, 7], 5: [375, 6, 369, 6], 4: [342, 4, 331, 4],
    },
  },
};
const clbTable = (t) => table(['CLB / NCLC', 'Reading', 'Writing', 'Listening', 'Speaking'],
  CLB_LEVELS.map((c) => [`${c === 10 ? '10 or more' : c}`, ...t.min[c].map((v) => `${v}+`)]));

// ---------------------------------------------------------------- FSW grid
// Mirrors mobile/src/features/fsw/utils/fswCalculator.ts.
const FSW_AGE = (age) => (age < 18 || age >= 47 ? 0 : age <= 35 ? 12 : 12 - (age - 35));

// ---------------------------------------------------------------- profile helpers
const CLB = (n) => ({ speaking: n, listening: n, reading: n, writing: n });
const BASE = {
  maritalStatus: 'single', age: 29, education: 'bachelors', canadianEducation: 'none',
  firstLang: CLB(9), hasSecondLang: false, secondLang: CLB(0), canadianWorkExp: 0, foreignWorkExp: 3,
  spouseEducation: 'less_than_secondary', spouseLang: CLB(0), spouseCanadianWorkExp: 0,
  hasProvincialNomination: false, hasSiblingInCanada: false, hasTradeCert: false, frenchNCLC7: false,
};

export function buildGuides({ crsCalc, FEED, SITE, CONTACT, APP_STORE_URL }) {
  const score = (over) => crsCalc({ ...BASE, ...over }).total;
  const breakdown = (over) => crsCalc({ ...BASE, ...over }).rows;
  const rows = FEED.rounds;
  const first = rows[rows.length - 1];
  const last = rows[0];
  const span = `rounds #${first.number} to #${last.number} (${first.dateFull} to ${last.dateFull})`;

  // Per-category stats over the rounds in the feed.
  const cats = new Map();
  for (const r of rows) {
    const c = cats.get(r.label) ?? { label: r.label, n: 0, min: Infinity, max: -Infinity, itas: 0, latest: r };
    c.n += 1; c.min = Math.min(c.min, r.crs); c.max = Math.max(c.max, r.crs); c.itas += r.size;
    cats.set(r.label, c);
  }
  const catRows = [...cats.values()].sort((a, b) => b.n - a.n || a.label.localeCompare(b.label));
  const pnp = cats.get('Provincial Nominee Program');
  const poolTotal = FEED.poolTotal ?? FEED.pool.reduce((s, b) => s + b.count, 0);

  // ---------- worked examples, run through the calculator itself
  const exA = { maritalStatus: 'single', age: 29, education: 'bachelors', firstLang: CLB(9), foreignWorkExp: 3, canadianWorkExp: 0 };
  const exB = {
    maritalStatus: 'married', age: 33, education: 'masters', firstLang: CLB(10), foreignWorkExp: 1, canadianWorkExp: 1,
    spouseEducation: 'bachelors', spouseLang: CLB(7), spouseCanadianWorkExp: 0,
  };
  const exAskill = breakdown(exA).find((r) => r.label === 'Skill transferability').val;
  // The prose under example 1 explains this exact split; fail the build if it drifts.
  if (exAskill !== 75) throw new Error(`guides: example 1 skill transferability is ${exAskill}, prose says 75`);
  const exTable = (over) => table(['Factor', 'Points', 'Maximum'], [
    ...breakdown(over).map((r) => [r.label, r.val, r.max]),
    ['**Total**', `**${score(over)}**`, '1,200'],
  ]);

  // ---------- improvement deltas (base: example A)
  const base = score(exA);
  const deltas = [
    ['Raise every ability from CLB 9 to CLB 10', score({ ...exA, firstLang: CLB(10) }) - base],
    ['Add a second official language at CLB 7 (no French bonus)', score({ ...exA, hasSecondLang: true, secondLang: CLB(7) }) - base],
    ['French at NCLC 7 or better, alongside English at CLB 5 or better', score({ ...exA, hasSecondLang: true, secondLang: CLB(7), frenchNCLC7: true }) - base],
    ['One year of skilled work in Canada', score({ ...exA, canadianWorkExp: 1 }) - base],
    ['Two years of skilled work in Canada', score({ ...exA, canadianWorkExp: 2 }) - base],
    ["A master's degree instead of a bachelor's", score({ ...exA, education: 'masters' }) - base],
    ['A two-year Canadian credential (Canadian study bonus)', score({ ...exA, canadianEducation: '1_2year' }) - base],
    ['A brother or sister in Canada (citizen or PR)', score({ ...exA, hasSiblingInCanada: true }) - base],
    ['A provincial nomination', score({ ...exA, hasProvincialNomination: true }) - base],
  ];
  const clb8 = score({ ...exA, firstLang: CLB(8) });

  const guides = [];

  // =================================================================== CRS points guide
  guides.push({
    file: 'crs-points', path: '/crs-points', priority: '0.8',
    title: 'How the CRS Score Is Calculated: Full Points Breakdown',
    description: 'Every CRS factor explained: age, education, language, Canadian work, spouse, skill transferability and additional points, with two worked examples.',
    llm: 'The full CRS grid as tables (core, spouse, skill transferability, additional points) with two worked examples computed by the site calculator.',
    short: 'Every CRS factor and its points, with worked examples',
    related: ['improve-crs-score', 'language-tests-clb', 'express-entry-draws'],
    md: `# How the CRS score is calculated

The Comprehensive Ranking System (CRS) is how Immigration, Refugees and Citizenship Canada (IRCC) ranks everyone in the Express Entry pool. Your profile gets a score out of **1,200**. When IRCC holds a round of invitations, it invites the highest-ranked candidates who fit that round, so the score decides whether you get an Invitation to Apply (ITA).

This guide walks through every part of the grid, with the actual point values, and ends with two worked examples. You can run your own numbers in the [CRS calculator](/calculators).

## The four parts of the score

| Part | What it covers | Maximum |
|---|---|---|
| A. Core human capital | Age, education, official languages, Canadian work experience | 500 (460 with a spouse) |
| B. Spouse or partner factors | Your spouse's education, language and Canadian work | 40 |
| C. Skill transferability | Combinations of education, language and work experience | 100 |
| D. Additional points | Provincial nomination, French, Canadian study, sibling in Canada | 600 |
| **Total** | | **1,200** |

One detail matters before the tables: if your spouse or common-law partner is coming to Canada with you, the core factors are scored on a slightly lower scale, and up to 40 points move to your partner's own factors. A partner who is a Canadian citizen or permanent resident, or who is not accompanying you, does not count, and you are scored as single.

## A. Core human capital

### Age

Points peak between 20 and 29 and fall each year after that, reaching zero at 45.

${table(['Age', 'Single', 'With spouse'], AGE_ROWS)}

### Level of education

Foreign credentials need an Educational Credential Assessment (ECA) to count. The level is the one on your ECA report, not the name of the program.

${table(['Highest credential', 'Single', 'With spouse'], EDU_ROWS.map(([l, s, m]) => [l, s, m]))}

### First official language

Language is scored per ability (reading, writing, listening and speaking), so the table below is for **each** of the four. Test scores are converted to Canadian Language Benchmark (CLB) levels first; see [language test scores to CLB](/language-tests-clb).

${table(['CLB level, per ability', 'Single', 'With spouse'], FIRST_LANG_ROWS)}

At CLB 10 in all four abilities, a single candidate gets 136 points from language alone, which is more than any other core factor except age and education.

### Second official language

If you also tested in the other official language (French for most English speakers), each ability earns 1 point at CLB 5 or 6, 3 points at CLB 7 or 8, and 6 points at CLB 9 or more. The total is capped at 24 points if you are single and 22 with a spouse.

### Canadian work experience

Skilled work done in Canada with authorization, in the last ten years.

${table(['Years in Canada', 'Single', 'With spouse'], CWE_ROWS.map(([l, s, m]) => [l, s, m]))}

## B. Spouse or common-law partner factors

These only apply when your partner is coming with you. They add up to 40 points.

- **Education:** up to 10 points: 2 for secondary school, 6 for a one-year program, 7 for a two-year program, 8 for a bachelor's, 9 for two or more credentials, and 10 for a master's or PhD.
- **Official language:** per ability, 1 point at CLB 5 or 6, 3 points at CLB 7 or 8, 5 points at CLB 9 or more, for up to 20.
- **Canadian work experience:** ${CWE_ROWS.slice(1).map(([l, , , sp]) => `${sp} for ${l.toLowerCase()}`).join(', ')}.

## C. Skill transferability

Skill transferability rewards combinations that predict success in Canada. It has three groups. Each group is capped at 50 points and the section is capped at 100.

**Education** combined with either strong language or Canadian work experience:

- A one-year-or-longer credential (including a single bachelor's) with CLB 7 or more in every ability earns 13 points, or 25 at CLB 9 or more.
- Two or more credentials, a master's or a PhD earns 25 at CLB 7 and 50 at CLB 9.
- The same education with Canadian work experience earns 13 or 25 points for one year, and 25 or 50 for two years or more.

**Foreign work experience** combined with language or Canadian work:

- One or two years of foreign work earns 13 points with CLB 7 in every ability, or 25 at CLB 9.
- Three or more years earns 25 at CLB 7 and 50 at CLB 9.
- Foreign work plus Canadian work earns 13 to 50 points depending on how much of each you have.

**Certificate of qualification** in a trade: 25 points with CLB 5 or more in every ability, or 50 with CLB 7 or more.

Language for transferability uses your **lowest** ability. One weak band, such as writing at CLB 8 when everything else is CLB 9, drops you to the lower tier for every combination that depends on language.

## D. Additional points

| Factor | Points |
|---|---|
| Provincial or territorial nomination | 600 |
| French at NCLC 7 or more in all four abilities, and English at CLB 5 or more | 50 |
| French at NCLC 7 or more, and English at CLB 4 or lower (or no English test) | 25 |
| Post-secondary study in Canada, three years or longer | 30 |
| Post-secondary study in Canada, one or two years | 15 |
| A brother or sister in Canada who is a citizen or permanent resident | 15 |

**Job offers no longer add points.** IRCC removed the 50 and 200 points for arranged employment on March 25, 2025. A job offer can still matter for eligibility in some programs, but it does not change your CRS score.

The additional section is capped at 600, which is why a nomination on its own takes the section to its maximum.

## Worked example 1: single, 29, bachelor's, CLB 9

A single 29-year-old with a bachelor's degree, CLB 9 in all four English abilities, three years of skilled work abroad, and no Canadian experience:

${exTable(exA)}

Most of the score comes from age, education and language. Skill transferability adds ${exAskill}: the bachelor's degree with CLB 9 earns 25 (a single degree tops out at 25 without Canadian work), and three years of foreign work with CLB 9 earns that group's full 50.

## Worked example 2: couple, 33, master's, one year in Canada

A 33-year-old with a master's degree, CLB 10 in all abilities, one year of foreign work and one year of Canadian work. Their spouse has a bachelor's degree, CLB 7 in English, and no Canadian work:

${exTable(exB)}

The spouse adds points of their own, but the principal applicant's core factors are on the lower "with spouse" scale. For some couples, the partner with the stronger profile should be the principal applicant. It is worth running the calculator both ways.

## How the score is used

A score has no pass mark on its own. Each round of invitations sets a cutoff: the score of the last person invited. Rounds are either general or limited to a program or category (for example, Canadian Experience Class, French-language proficiency or healthcare), and the cutoffs differ widely between them. See [Express Entry draw types](/express-entry-draws) for what recent rounds needed, or the [full draw history](/draws).

If two candidates have the same score at the cutoff, IRCC uses the date and time each profile was submitted, and the earlier profile is invited first.

## Sources

- IRCC, [Comprehensive Ranking System criteria](${LINKS.crsGrid})
- IRCC, [Express Entry rounds of invitations](${LINKS.eeRounds})

This guide is a plain-language summary. IRCC's own grid is the authority, and your official score is the one in your Express Entry profile.
`,
  });

  // =================================================================== improve
  guides.push({
    file: 'improve-crs-score', path: '/improve-crs-score', priority: '0.8',
    title: 'How to Improve Your CRS Score: What Each Change Is Worth',
    description: 'Practical ways to raise an Express Entry CRS score, from language retests and French to Canadian work and nominations, each with the points it adds.',
    llm: 'Ranked ways to raise a CRS score, each with the exact points gained for a sample profile computed by the site calculator.',
    short: 'What actually moves a CRS score, measured in points',
    related: ['crs-points', 'language-tests-clb', 'express-entry-draws'],
    md: `# How to improve your CRS score

If your score sits below recent cutoffs, the useful question is which change gives the most points for the effort. This guide measures each option against one sample profile, using the same calculator that runs on the [calculators page](/calculators).

**The sample profile:** single, 29 years old, a bachelor's degree, CLB 9 in all four English abilities, three years of skilled work abroad, no Canadian experience. That profile scores **${base}**.

## What each change is worth

${table(['Change', 'Points added', 'New score'], deltas.map(([l, d]) => [l, `+${d}`, base + d]))}

The numbers are for this profile only. The same change can be worth more or less for you, because several factors interact. Run your own profile in the [calculator](/calculators) before you commit time or money to one route.

## 1. Retake your language test

Language is usually the fastest lever, because it counts twice: once in the core score, and again in skill transferability, which looks at your lowest ability.

- Moving from CLB 9 to CLB 10 in every ability is worth **+${deltas[0][1]}** for the sample profile.
- The cost of a weak ability is larger. The same profile at CLB 8 instead of CLB 9 scores ${clb8}, which is **${base - clb8} points lower**, mostly because CLB 9 is the threshold for the top transferability tier.

Look at your lowest band first. One ability at CLB 8 holds back every combination that depends on language. The [CLB conversion tables](/language-tests-clb) show the exact score you need on IELTS, CELPIP, PTE Core, TEF or TCF.

## 2. Learn French

French is the largest bonus most people can earn without a nomination. French at NCLC 7 or better in all four abilities adds 50 additional points when your English is at least CLB 5, on top of second-language points. For the sample profile that is **+${deltas[2][1]}** in total.

French also opens French-language proficiency rounds, which IRCC has run regularly with cutoffs well below general rounds. See [draw types](/express-entry-draws).

## 3. Gain Canadian work experience

One year of skilled work in Canada adds core points and unlocks transferability combinations: **+${deltas[3][1]}** for one year and **+${deltas[4][1]}** for two for the sample profile. Canadian experience also makes you eligible for the Canadian Experience Class, which has its own rounds.

## 4. Add a credential

A master's degree, or a second credential where one is three years or longer, moves you up a tier in both education and skill transferability. For the sample profile, a master's instead of a bachelor's adds **+${deltas[5][1]}**. Make sure any new foreign credential is covered by an ECA.

Studying in Canada adds 15 points for a one- or two-year program and 30 for three years or more, separately from the education factor.

## 5. Check your spouse's profile

If you have an accompanying spouse or partner:

- Their language test can add up to 20 points, and their education and Canadian work up to 10 each.
- Run the calculator with each of you as the principal applicant. The stronger profile as principal can be worth dozens of points.
- If your partner will not come with you, or is already a citizen or permanent resident, you are scored as single.

## 6. Count everything you already have

Points are often missed rather than missing:

- **A sibling in Canada** who is a citizen or permanent resident is worth 15 points.
- **Two credentials** (for example, a diploma and a degree) can score higher than the highest one alone, if one of them is three years or longer.
- **A certificate of qualification** in a trade adds skill transferability points.
- **Work experience** keeps accruing. Update your profile when you pass a year mark, because points do not update themselves.

## 7. Seek a provincial nomination

A provincial or territorial nomination adds 600 points, which in practice guarantees an invitation in the next nominee round. Provinces run their own streams with their own criteria, often tied to an occupation, a job offer, or ties to the province. See the [BC PNP and Saskatchewan calculators](/calculators#bc).

## What no longer works

**Job offers.** Arranged employment used to add 50 or 200 points. IRCC removed those points on March 25, 2025, so a job offer no longer changes your CRS score.

**Age** cannot be improved, and your score is recalculated as you get older: from 30, each birthday costs points. That makes the other levers more urgent, not less.

## Sources

- IRCC, [Comprehensive Ranking System criteria](${LINKS.crsGrid})
- IRCC, [Language testing for Express Entry](${LINKS.langTests})
`,
  });

  // =================================================================== CLB conversion
  guides.push({
    file: 'language-tests-clb', path: '/language-tests-clb', priority: '0.8',
    title: 'IELTS, CELPIP, PTE Core, TEF & TCF to CLB: Conversion Tables',
    description: 'Convert IELTS, CELPIP, PTE Core, TEF Canada and TCF Canada scores to Canadian Language Benchmark levels, with the CLB you need for Express Entry.',
    llm: 'Minimum score per CLB level (4 to 10) for each accepted Express Entry language test and ability, plus the CLB levels that matter for eligibility and CRS.',
    short: 'Convert any accepted test score to a CLB level',
    related: ['crs-points', 'improve-crs-score', 'fsw-67-points'],
    md: `# Language test scores to CLB: conversion tables

Express Entry does not use test scores directly. IRCC converts each ability (reading, writing, listening, speaking) to a **Canadian Language Benchmark** level, or **NCLC** for French. Your CRS points, your eligibility and the transferability bonuses all depend on those levels.

The tables below give the minimum score for each level. They are the same thresholds the [CRS calculator](/calculators) uses.

## Which tests are accepted

| Language | Test | Score scale |
|---|---|---|
| English | CELPIP-General | Levels 1 to 12 |
| English | ${TESTS.ielts.name} | ${TESTS.ielts.scale} |
| English | ${TESTS.pte.name} | ${TESTS.pte.scale} |
| French | ${TESTS.tef.name} | ${TESTS.tef.scale} |
| French | ${TESTS.tcf.name} | ${TESTS.tcf.scale} |

Results are valid for two years from the test date, and they must still be valid on the day you submit your application for permanent residence, not just when you create your profile. IELTS Academic and PTE Academic are not accepted for Express Entry.

## CELPIP-General

CELPIP is designed around the CLB scale, so the conversion is direct: a CELPIP level of 9 is CLB 9 for that ability, up to CLB 10 or more at level 10 and above.

## IELTS General Training

${clbTable(TESTS.ielts)}

## PTE Core

${clbTable(TESTS.pte)}

## TEF Canada

These thresholds apply to tests taken on or after December 10, 2023. Older TEF results use different tables, which the calculator also supports.

${clbTable(TESTS.tef)}

## TCF Canada

${clbTable(TESTS.tcf)}

## The CLB levels that matter

- **CLB 7 in every ability** is the minimum for the Federal Skilled Worker Program, and the first tier for most skill-transferability points.
- **CLB 9 in every ability** unlocks the top transferability tier. For many profiles, this threshold is worth more than any other single improvement. See [how to improve your CRS score](/improve-crs-score).
- **CLB 10** earns the most core language points: 34 per ability if you are single.
- **CLB 7 (or 5 for some jobs)** is the minimum for the Canadian Experience Class, depending on the job's skill level.
- **NCLC 7 in French** earns 25 or 50 additional points.

Each ability is converted separately, and transferability uses your lowest one. A profile at CLB 10, 10, 10 and 8 is treated as CLB 8 for transferability.

## Sources

- IRCC, [Language testing for Express Entry](${LINKS.langTests})

Test providers and IRCC occasionally revise equivalencies. If your test date is close to a change, check IRCC's page for the table that applies to you.
`,
  });

  // =================================================================== FSW 67 points
  const fswAges = [36, 37, 40, 45, 46, 47];
  guides.push({
    file: 'fsw-67-points', path: '/fsw-67-points', priority: '0.7',
    title: 'FSW 67 Points Explained: The Federal Skilled Worker Grid',
    description: 'How the Federal Skilled Worker 67-point grid works: language, education, experience, age, arranged employment and adaptability, plus the minimum requirements.',
    llm: 'The six FSW selection factors with their point values and the minimum requirements (CLB 7, one year of continuous skilled work, ECA, proof of funds).',
    short: 'The six selection factors and the minimum requirements',
    related: ['crs-points', 'language-tests-clb', 'express-entry-process'],
    md: `# The FSW 67-point grid, explained

The Federal Skilled Worker Program (FSW) is one of the three programs that feed the Express Entry pool. Before you can enter the pool under FSW, you must score at least **67 out of 100** on its six selection factors. This is a pass/fail check, separate from the CRS score that ranks you once you are in.

You can run the grid in the [FSW calculator](/calculators#fsw).

## Minimum requirements

Even with 67 points, you must also have:

- **One year of continuous skilled work experience**, full time (or the equivalent part time), within the last ten years, in one occupation at NOC TEER level 0, 1, 2 or 3.
- **CLB 7 in all four abilities** of your first official language. See the [CLB conversion tables](/language-tests-clb).
- **An Educational Credential Assessment** for education completed outside Canada.
- **Proof of funds** to support yourself and your family, unless you are authorized to work in Canada and have a valid job offer. IRCC updates the amounts every year; see its [proof of funds page](${LINKS.funds}).

## The six factors

${table(['Factor', 'Maximum points'], [['Language skills', 28], ['Education', 25], ['Work experience', 15], ['Age', 12], ['Arranged employment in Canada', 10], ['Adaptability', 10], ['**Total**', '**100**']])}

### 1. Language (up to 28)

Your first official language earns points per ability: 6 at CLB 9 or more, 5 at CLB 8 and 4 at CLB 7, for up to 24. Below CLB 7 in any ability, you are not eligible. A second official language at CLB 5 or more in all four abilities adds 4.

### 2. Education (up to 25)

${table(['Credential', 'Points'], [['Doctoral degree', 25], ["Master's or professional degree", 23], ['Two or more credentials, one of them three years or longer', 22], ['Three-year or longer degree or diploma', 21], ['Two-year post-secondary program', 19], ['One-year post-secondary program', 15], ['Secondary school', 5]])}

### 3. Work experience (up to 15)

${table(['Years of skilled work', 'Points'], [['1 year', 9], ['2 to 3 years', 11], ['4 to 5 years', 13], ['6 years or more', 15]])}

### 4. Age (up to 12)

Age earns 12 points from 18 to 35, then one point less for each year after 35, reaching zero at 47.

${table(['Age', 'Points'], [['Under 18', 0], ['18 to 35', FSW_AGE(35)], ...fswAges.map((a) => [a === 47 ? '47 or older' : String(a), FSW_AGE(a)])])}

### 5. Arranged employment (10)

A valid job offer of at least one year from a Canadian employer, in a skilled occupation, earns 10 points. This is separate from CRS, where job offers no longer add points.

### 6. Adaptability (up to 10)

Any combination of the following, capped at 10:

- Your own previous skilled work in Canada (at least one year): 10
- Your own previous full-time study in Canada (at least two years): 5
- Arranged employment in Canada: 5
- A relative in Canada who is a citizen or permanent resident: 5
- Your spouse's or partner's language at CLB 4 or more: 5
- Your spouse's previous study in Canada: 5
- Your spouse's previous work in Canada: 5

## An example

A 31-year-old with a bachelor's degree, CLB 8 in all abilities, three years of skilled work and no ties to Canada scores 20 (language) + 21 (education) + 11 (experience) + 12 (age) = **64**. That is short of 67. Raising one ability to CLB 9 adds only 1 point, but moving all four to CLB 9 gives 24 for language and a total of **68**, which passes.

## FSW versus CRS

Passing the 67-point grid only gets you into the pool. Your rank in the pool, and therefore whether you are invited, depends entirely on the [CRS score](/crs-points).

## Sources

- IRCC, [Six selection factors: Federal Skilled Worker Program](${LINKS.fswFactors})
- IRCC, [Proof of funds](${LINKS.funds})
`,
  });

  // =================================================================== draw types
  guides.push({
    file: 'express-entry-draws', path: '/express-entry-draws', priority: '0.8',
    title: 'Express Entry Draw Types Explained: CEC, PNP, French & More',
    description: 'What each kind of Express Entry round means, who qualifies, and the CRS cutoffs recent rounds of each type needed, from IRCC data.',
    llm: 'The kinds of Express Entry rounds (general, program-specific, category-based, PNP) with per-category cutoff ranges and invitation counts from recent IRCC rounds.',
    short: 'What each round type means and what it needed',
    related: ['crs-points', 'improve-crs-score', 'express-entry-process'],
    md: `# Express Entry draw types, explained

IRCC invites candidates from the Express Entry pool in **rounds of invitations**, often called draws. Each round has a type, a number of invitations, and a cutoff score: the CRS of the lowest-ranked person invited. The type decides who can be invited at all, which is why cutoffs vary so much from one round to the next.

The figures on this page cover IRCC's ${rows.length} most recent rounds, ${span}. For every round, see the [draw history](/draws) and [draw analytics](/analytics).

## The kinds of rounds

**General rounds** consider everyone in the pool, whatever their program. Apart from nominee rounds, they tend to have the highest cutoffs.

**Program-specific rounds** invite only candidates eligible for one program:

- **Canadian Experience Class (CEC):** at least one year of skilled work in Canada.
- **Provincial Nominee Program (PNP):** candidates who already hold a provincial or territorial nomination. Cutoffs are high because the nomination adds 600 points.
- **Federal Skilled Trades:** candidates eligible for the trades program.

**Category-based rounds** were introduced in 2023. They target candidates with a particular attribute, usually an occupation or French ability, regardless of how they rank overall. IRCC sets the categories each year; recent ones include French-language proficiency, healthcare and social services, trades, and transport occupations. See IRCC's [category-based selection page](${LINKS.categories}) for the current list and the occupations each covers.

## What recent rounds needed

${table(['Round type', 'Rounds', 'Lowest cutoff', 'Highest cutoff', 'Invitations'], catRows.map((c) => [c.label, c.n, c.min, c.max, fmt(c.itas)]))}

The most recent round was #${last.number} on ${last.dateFull}: ${last.label}, ${fmt(last.size)} invitations, cutoff ${last.crs}.

## Reading the table

- **A low cutoff in one category is not a low cutoff for you** unless you qualify for that category. Category rounds check your profile's occupation and experience, or your French test results.
- **PNP cutoffs look high**, but the scores include the 600-point nomination.${pnp ? ` Without it, the cutoffs in these rounds were ${pnp.min - 600} to ${pnp.max - 600}.` : ''}
- **Small sample sizes.** Some types ran only once or twice in this period. One round tells you little about the next.

## Where the pool sits

The pool held ${fmt(poolTotal)} profiles${FEED.distributionAsOf ? ` as of ${FEED.distributionAsOf}` : ''}. The distribution by score band:

${table(['CRS band', 'Profiles'], FEED.pool.map((b) => [b.label, fmt(b.count)]))}

Comparing your score with this table shows how many candidates rank above you in a general round.

## The tie-breaking rule

When several candidates have exactly the cutoff score, IRCC invites those whose profiles were submitted earliest, based on date and time. Every round's tie-breaking time is published with the results.

## After an invitation

An Invitation to Apply gives you 60 days to submit a complete application for permanent residence. See the [Express Entry process](/express-entry-process) for what comes next.

## Sources

- IRCC, [Express Entry rounds of invitations](${LINKS.eeRounds})
- IRCC, [Category-based selection](${LINKS.categories})

Round data on this site is mirrored from IRCC's published feed and refreshed automatically when a new round is posted.
`,
  });

  // =================================================================== process
  guides.push({
    file: 'express-entry-process', path: '/express-entry-process', priority: '0.8',
    title: 'Express Entry Process Step by Step: From Profile to PR',
    description: 'The Express Entry process in order: eligibility, language test, ECA, profile, ITA, application, biometrics, medical and confirmation of PR.',
    llm: 'The Express Entry sequence from eligibility checks through profile, ITA, e-APR, AOR, biometrics, medical, background check and COPR, with deadlines at each step.',
    short: 'Every step from eligibility to landing, with deadlines',
    related: ['crs-points', 'fsw-67-points', 'express-entry-draws'],
    md: `# The Express Entry process, step by step

Express Entry is IRCC's online system for three economic immigration programs: the **Federal Skilled Worker Program**, the **Canadian Experience Class** and the **Federal Skilled Trades Program**. Provinces can also nominate candidates from the pool. This guide lists every step in order, with the deadlines that apply. Track your own dates in the [application timeline](/timeline).

## Before you create a profile

### 1. Check which program you fit

- **Federal Skilled Worker:** at least one year of continuous skilled work in the last ten years, CLB 7 in every ability, and 67 points on the [FSW grid](/fsw-67-points).
- **Canadian Experience Class:** at least one year of skilled work in Canada in the last three years, with CLB 7 (for TEER 0 and 1 jobs) or CLB 5 (for TEER 2 and 3 jobs).
- **Federal Skilled Trades:** at least two years of trade experience in the last five years, plus a job offer or a Canadian certificate of qualification.

IRCC's [eligibility page](${LINKS.eeEligibility}) has the full criteria.

### 2. Take an approved language test

Accepted tests are CELPIP-General, IELTS General Training and PTE Core for English, and TEF Canada and TCF Canada for French. Results are valid for two years. See the [CLB conversion tables](/language-tests-clb).

### 3. Get an Educational Credential Assessment

If you studied outside Canada, an ECA from a designated organization confirms what your credential is worth in Canada. ECAs are valid for five years. Without one, foreign education earns no CRS points.

### 4. Check your proof of funds

FSW and Federal Skilled Trades candidates must show settlement funds, unless they are authorized to work in Canada and have a valid job offer. CEC candidates are exempt. The amounts are updated every year on IRCC's [proof of funds page](${LINKS.funds}).

## In the pool

### 5. Create your Express Entry profile

You enter your details in your IRCC account. If you are eligible, you go into the pool with a CRS score. A profile stays valid for **12 months**; after that you must create a new one.

Keep it up to date. A new test result, another year of work, or a change in your family situation can change your score.

### 6. Wait for an Invitation to Apply

IRCC holds rounds regularly. If your score meets the cutoff for a round you qualify for, you receive an ITA in your account. See [draw types](/express-entry-draws) for how rounds work.

## After the invitation

### 7. Submit your application within 60 days

You have **60 days** from the ITA to submit an electronic Application for Permanent Residence (e-APR) with all supporting documents: police certificates, proof of work experience, identity documents and, if required, proof of funds. The details must match your profile. If your score would drop below the round's cutoff based on corrected information, you may no longer be eligible.

Use the [document checklists](/checklists) to prepare. Police certificates can take months in some countries, so many candidates request them before the ITA arrives.

### 8. Acknowledgement of receipt (AOR)

IRCC confirms it received your application. Processing time is counted from this point.

### 9. Biometrics

You receive a biometric instruction letter, and must give fingerprints and a photo within **30 days**, unless you gave biometrics in the last ten years and they are still valid.

### 10. Medical exam

You and your family members complete an immigration medical exam with an IRCC-approved panel physician, if you have not done one already.

### 11. Eligibility and background checks

IRCC reviews your eligibility, admissibility and security. It may ask for more documents. Respond by the deadline in the request.

### 12. Final decision and confirmation of permanent residence

If approved, you are asked for your passport or for portal details, then receive a **Confirmation of Permanent Residence (COPR)**. If you are outside Canada, you get a permanent resident visa to travel. You become a permanent resident when you complete landing.

## How long it takes

IRCC's service standard is to process most complete Express Entry applications within about six months of receipt. Actual times vary; see current [processing times](/processing-times).

## Sources

- IRCC, [Who can apply: Express Entry](${LINKS.eeEligibility})
- IRCC, [Proof of funds](${LINKS.funds})
- IRCC, [Language testing](${LINKS.langTests})
`,
  });

  // =================================================================== hub
  const hub = {
    file: 'guides', path: '/guides', priority: '0.8',
    title: 'Express Entry Guides: CRS Points, Draws, Language & Process',
    description: 'Plain-language Express Entry guides: how the CRS score works, how to raise it, language test conversions, the FSW grid, draw types and the full process.',
    llm: 'Index of the long-form Express Entry guides on this site.',
    related: [],
    hub: true,
  };
  hub.md = `# Express Entry guides

Plain-language guides to Canada's Express Entry system, written to sit alongside the calculators and live draw data on this site. Every table on these pages is generated from the same data the calculators use, so the numbers stay in step.

${guides.map((g) => `## [${g.title.replace(/:.*$/, '')}](${g.path})\n\n${g.description}`).join('\n\n')}

## Tools that go with them

- [CRS, FSW, BC PNP and Saskatchewan calculators](/calculators)
- [Latest Express Entry draws](/draws) and [draw analytics](/analytics)
- [IRCC processing times](/processing-times)
- [Document checklists](/checklists) and the [application timeline](/timeline)
`;

  // =================================================================== about
  const about = {
    file: 'about', path: '/about', priority: '0.5',
    title: 'About CRS Pulse — Who We Are and Where Our Data Comes From',
    description: 'What CRS Pulse is, who makes it, where its draw and processing-time data comes from, how it is funded, and how to contact us or report a correction.',
    llm: 'Who publishes CRS Pulse, the data sources behind every figure, how the site is funded, and how to send corrections.',
    related: [],
    about: true,
    md: `# About CRS Pulse

CRS Pulse is a free toolkit for people applying to immigrate to Canada through Express Entry. It has an iPhone app and this website, with calculators for the CRS score, the FSW 67-point grid, BC PNP SIRS and Saskatchewan SINP, live IRCC draw results, processing times, document checklists and guides.

## Who makes it

CRS Pulse is built and maintained by an independent developer. It is **not** affiliated with, endorsed by, or connected to Immigration, Refugees and Citizenship Canada (IRCC) or any other part of the Government of Canada, and it is not a law firm or a licensed immigration consultancy.

## Where the data comes from

- **Express Entry rounds and the pool distribution** come from IRCC's published rounds-of-invitations feed on canada.ca. A scheduled job copies it into this site's repository, and the site rebuilds whenever a new round appears. The most recent round on the site is #${last.number}, ${last.dateFull}.
- **Processing times** come from IRCC's published processing-time data, refreshed on a schedule.
- **Point grids** (CRS, FSW, BC PNP SIRS, SINP) follow the official criteria published by IRCC and the provinces. Each calculator cites its source.
- **Guides** are written from IRCC's published rules, and every table in them is generated from the calculators' own data. Each guide links its sources.

When IRCC changes a rule, we update the calculator and the guides together. If you find something out of date, please tell us.

## How it is funded

CRS Pulse is free. The app shows Google AdMob ads and the website may show Google AdSense ads. There are no paid tiers, no subscriptions and no in-app purchases. Ads never affect scores, data or the content of the guides.

## Your privacy

Calculator inputs stay in your browser or on your phone; nothing you enter is uploaded. The [privacy policy](/privacy) describes exactly what the app and the website collect.

## Important

Scores, predictions and timelines on CRS Pulse are estimates for guidance only. They are not immigration or legal advice. Before you act on them, check IRCC's official tools at canada.ca or speak to a licensed professional.

## Contact and corrections

Email **[${CONTACT}](mailto:${CONTACT})** with questions, corrections or bug reports. For a correction, include the page address and, if you can, a link to the official source. The iPhone app is on the [App Store](${APP_STORE_URL}).
`,
  };

  return { guides, hub, about };
}
