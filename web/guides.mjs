import { TESTS, CLB_LEVELS } from './clb.mjs';
import { LANG, LOCALE, T } from './i18n.mjs';

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

// The French build (CRS_LANG=fr) renders each guide from its French text. Both languages
// sit side by side, L(english, french), so the shared numbers and tables can't drift apart.
const L = (en, fr) => (LANG === 'fr' ? fr : en);
const fmt = (n) => Number(n).toLocaleString(LOCALE);
// IRCC's dateFull strings are English text; the French build formats the date itself.
const frDate = (d) => new Date(d).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).replace(/^1 /, '1er ');
const dateOf = (r) => L(r.dateFull, frDate(`${r.date}T12:00:00Z`));
const table = (head, rows) =>
  [`| ${head.join(' | ')} |`, `| ${head.map(() => '---').join(' | ')} |`, ...rows.map((r) => `| ${r.join(' | ')} |`)].join('\n');

// ---------------------------------------------------------------- CRS tables
// Mirrors mobile/src/features/onboarding/utils/crsCalculator.ts.
const AGE_ROWS = [
  [L('17 or under', '17 ans ou moins'), 0, 0], ['18', 99, 90], ['19', 105, 95], [L('20 to 29', '20 à 29'), 110, 100], ['30', 105, 95],
  ['31', 99, 90], ['32', 94, 85], ['33', 88, 80], ['34', 83, 75], ['35', 77, 70], ['36', 72, 65],
  ['37', 66, 60], ['38', 61, 55], ['39', 55, 50], ['40', 50, 45], ['41', 39, 35], ['42', 28, 25],
  ['43', 17, 15], ['44', 6, 5], [L('45 or older', '45 ans ou plus'), 0, 0],
];
const EDU_ROWS = [
  [L('Less than secondary school', 'Moins qu’un diplôme d’études secondaires'), 0, 0, 0],
  [L('Secondary diploma (high school)', 'Diplôme d’études secondaires'), 30, 28, 2],
  [L('One-year post-secondary program', 'Programme postsecondaire d’un an'), 90, 84, 6],
  [L('Two-year post-secondary program', 'Programme postsecondaire de deux ans'), 98, 91, 7],
  [L("Bachelor's degree, or a program of three years or more", 'Baccalauréat, ou programme de trois ans ou plus'), 120, 112, 8],
  [L('Two or more credentials, one of them three years or longer', 'Deux diplômes ou plus, dont un d’au moins trois ans'), 128, 119, 9],
  [L("Master's degree, or a professional degree needed to practise a licensed profession", 'Maîtrise, ou diplôme professionnel requis pour exercer une profession réglementée'), 135, 126, 10],
  [L('Doctoral degree (PhD)', 'Doctorat (Ph. D.)'), 150, 140, 10],
];
const FIRST_LANG_ROWS = [
  [L('CLB 4 or 5', 'NCLC 4 ou 5'), 6, 6], [L('CLB 6', 'NCLC 6'), 9, 8], [L('CLB 7', 'NCLC 7'), 17, 16], [L('CLB 8', 'NCLC 8'), 23, 22], [L('CLB 9', 'NCLC 9'), 31, 29], [L('CLB 10 or more', 'NCLC 10 ou plus'), 34, 32],
];
const CWE_ROWS = [[L('None or less than a year', 'Aucune ou moins d’un an'), 0, 0, 0], [L('1 year', '1 an'), 40, 35, 5], [L('2 years', '2 ans'), 53, 46, 7], [L('3 years', '3 ans'), 64, 56, 8], [L('4 years', '4 ans'), 72, 63, 9], [L('5 years or more', '5 ans ou plus'), 80, 70, 10]];

// ---------------------------------------------------------------- CLB tables
// Shared with the in-browser calculators (clb.mjs), so the tables here and the live
// conversion on the calculator pages can't disagree.
const clbTable = (t) => table(L(['CLB / NCLC', 'Reading', 'Writing', 'Listening', 'Speaking'], ['NCLC', 'Compréhension de l’écrit', 'Expression écrite', 'Compréhension de l’oral', 'Expression orale']),
  CLB_LEVELS.map((c) => [`${c === 10 ? L('10 or more', '10 ou plus') : c}`, ...t.min[c].map((v) => `${String(v).replace('.', L('.', ','))}+`)]));

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
  const span = L(`rounds #${first.number} to #${last.number} (${first.dateFull} to ${last.dateFull})`, `les rondes n° ${first.number} à ${last.number} (du ${dateOf(first)} au ${dateOf(last)})`);

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
  const exAskill = breakdown(exA).find((r) => /skill transferability|transférabilité/i.test(r.label)).val;
  // The prose under example 1 explains this exact split; fail the build if it drifts.
  if (exAskill !== 75) throw new Error(`guides: example 1 skill transferability is ${exAskill}, prose says 75`);
  const exTable = (over) => table(L(['Factor', 'Points', 'Maximum'], ['Facteur', 'Points', 'Maximum']), [
    ...breakdown(over).map((r) => [r.label, r.val, r.max]),
    ['**Total**', `**${score(over)}**`, fmt(1200)],
  ]);

  // ---------- improvement deltas (base: example A)
  const base = score(exA);
  const deltas = [
    [L('Raise every ability from CLB 9 to CLB 10', 'Passer de NCLC 9 à NCLC 10 dans chaque compétence'), score({ ...exA, firstLang: CLB(10) }) - base],
    [L('Add a second official language at CLB 7 (no French bonus)', 'Ajouter une deuxième langue officielle au NCLC 7 (sans bonus de français)'), score({ ...exA, hasSecondLang: true, secondLang: CLB(7) }) - base],
    [L('French at NCLC 7 or better, alongside English at CLB 5 or better', 'Français au NCLC 7 ou plus, avec l’anglais au NCLC 5 ou plus'), score({ ...exA, hasSecondLang: true, secondLang: CLB(7), frenchNCLC7: true }) - base],
    [L('One year of skilled work in Canada', 'Un an de travail qualifié au Canada'), score({ ...exA, canadianWorkExp: 1 }) - base],
    [L('Two years of skilled work in Canada', 'Deux ans de travail qualifié au Canada'), score({ ...exA, canadianWorkExp: 2 }) - base],
    [L("A master's degree instead of a bachelor's", 'Une maîtrise au lieu d’un baccalauréat'), score({ ...exA, education: 'masters' }) - base],
    [L('A two-year Canadian credential (Canadian study bonus)', 'Un diplôme canadien de deux ans (points pour études au Canada)'), score({ ...exA, canadianEducation: '1_2year' }) - base],
    [L('A brother or sister in Canada (citizen or PR)', 'Un frère ou une sœur au Canada (citoyen ou RP)'), score({ ...exA, hasSiblingInCanada: true }) - base],
    [L('A provincial nomination', 'Une désignation provinciale'), score({ ...exA, hasProvincialNomination: true }) - base],
  ];
  const clb8 = score({ ...exA, firstLang: CLB(8) });

  const guides = [];

  // =================================================================== CRS points guide
  guides.push({
    file: 'crs-points', path: '/crs-points', priority: '0.8',
    title: L('How the CRS Score Is Calculated: Full Points Breakdown', "Calcul du score CRS : tous les points, facteur par facteur"),
    description: L('Every CRS factor explained: age, education, language, Canadian work, spouse, skill transferability and additional points, with two worked examples.', "Chaque facteur du CRS expliqué : âge, études, langues, expérience canadienne, conjoint, transférabilité des compétences et points supplémentaires, avec deux exemples chiffrés."),
    llm: 'The full CRS grid as tables (core, spouse, skill transferability, additional points) with two worked examples computed by the site calculator.',
    short: L('Every CRS factor and its points, with worked examples', "Chaque facteur du CRS et ses points, avec des exemples"),
    related: ['improve-crs-score', 'language-tests-clb', 'express-entry-draws'],
    md: L(`# How the CRS score is calculated

The Comprehensive Ranking System (CRS) is how Immigration, Refugees and Citizenship Canada (IRCC) ranks everyone in the Express Entry pool. Your profile gets a score out of **1,200**. When IRCC holds a round of invitations, it invites the highest-ranked candidates who fit that round, so the score decides whether you get an Invitation to Apply (ITA).

This guide walks through every part of the grid, with the actual point values, and ends with two worked examples. You can run your own numbers in the [CRS calculator](/crs-calculator).

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
`, `# Comment le score CRS est calculé

Le Système de classement global (SCG, ou CRS en anglais) est la grille avec laquelle Immigration, Réfugiés et Citoyenneté Canada (IRCC) classe tous les candidats du bassin d’Entrée express. Votre profil reçoit un score sur **${fmt(1200)}**. À chaque ronde d’invitations, IRCC invite les candidats les mieux classés parmi ceux qui correspondent à la ronde : c’est donc votre score qui décide si vous recevez une invitation à présenter une demande (IPD).

Ce guide passe en revue chaque partie de la grille, avec les points réels, et se termine par deux exemples chiffrés. Vous pouvez calculer votre propre score avec le [calculateur CRS](/crs-calculator).

## Les quatre parties du score

| Partie | Ce qu’elle couvre | Maximum |
|---|---|---|
| A. Capital humain de base | Âge, études, langues officielles, expérience de travail au Canada | 500 (460 avec un conjoint) |
| B. Facteurs liés au conjoint | Études, langue et expérience canadienne de votre conjoint | 40 |
| C. Transférabilité des compétences | Combinaisons d’études, de langue et d’expérience de travail | 100 |
| D. Points supplémentaires | Désignation provinciale, français, études au Canada, frère ou sœur au Canada | 600 |
| **Total** | | **${fmt(1200)}** |

Un point important avant les tableaux : si votre époux ou conjoint de fait vous accompagne au Canada, vos facteurs de base sont notés sur une échelle un peu plus basse, et jusqu’à 40 points passent aux facteurs de votre conjoint. Un conjoint citoyen canadien ou résident permanent, ou qui ne vous accompagne pas, ne compte pas : vous êtes alors noté comme une personne seule.

## A. Capital humain de base

### Âge

Les points sont au maximum entre 20 et 29 ans, puis baissent chaque année pour tomber à zéro à 45 ans.

${table(['Âge', 'Seul', 'Avec conjoint'], AGE_ROWS)}

### Niveau d’études

Un diplôme étranger doit faire l’objet d’une évaluation des diplômes d’études (EDE) pour compter. C’est le niveau indiqué dans le rapport d’EDE qui compte, pas le nom du programme.

${table(['Diplôme le plus élevé', 'Seul', 'Avec conjoint'], EDU_ROWS.map(([l, s, m]) => [l, s, m]))}

### Première langue officielle

La langue est notée par compétence (compréhension de l’écrit, expression écrite, compréhension de l’oral et expression orale) : le tableau ci-dessous s’applique donc à **chacune** des quatre. Les résultats de test sont d’abord convertis en Niveaux de compétence linguistique canadiens (NCLC) ; voir [les résultats de test en NCLC](/language-tests-clb).

${table(['Niveau NCLC, par compétence', 'Seul', 'Avec conjoint'], FIRST_LANG_ROWS)}

Au NCLC 10 dans les quatre compétences, une personne seule obtient 136 points pour la langue seulement, plus que tout autre facteur de base à part l’âge et les études.

### Deuxième langue officielle

Si vous avez aussi passé un test dans l’autre langue officielle (le français pour la plupart des anglophones), chaque compétence rapporte 1 point au NCLC 5 ou 6, 3 points au NCLC 7 ou 8, et 6 points au NCLC 9 ou plus. Le total est plafonné à 24 points pour une personne seule et à 22 avec un conjoint.

### Expérience de travail au Canada

Travail qualifié effectué au Canada avec autorisation, au cours des dix dernières années.

${table(['Années au Canada', 'Seul', 'Avec conjoint'], CWE_ROWS.map(([l, s, m]) => [l, s, m]))}

## B. Facteurs liés à l’époux ou au conjoint de fait

Ils ne s’appliquent que si votre conjoint vous accompagne, pour un maximum de 40 points.

- **Études :** jusqu’à 10 points : 2 pour un diplôme d’études secondaires, 6 pour un programme d’un an, 7 pour un programme de deux ans, 8 pour un baccalauréat, 9 pour deux diplômes ou plus, et 10 pour une maîtrise ou un doctorat.
- **Langue officielle :** par compétence, 1 point au NCLC 5 ou 6, 3 points au NCLC 7 ou 8, 5 points au NCLC 9 ou plus, jusqu’à 20.
- **Expérience de travail au Canada :** ${CWE_ROWS.slice(1).map(([l, , , sp]) => `${sp} pour ${l}`).join(', ')}.

## C. Transférabilité des compétences

La transférabilité des compétences récompense les combinaisons qui prédisent une bonne intégration au Canada. Elle comprend trois groupes, chacun plafonné à 50 points, et la section entière est plafonnée à 100.

**Les études**, combinées à une bonne maîtrise de la langue ou à de l’expérience canadienne :

- Un diplôme d’un an ou plus (y compris un seul baccalauréat) avec le NCLC 7 ou plus dans chaque compétence rapporte 13 points, ou 25 au NCLC 9 ou plus.
- Deux diplômes ou plus, une maîtrise ou un doctorat rapportent 25 points au NCLC 7 et 50 au NCLC 9.
- Les mêmes études avec de l’expérience canadienne rapportent 13 ou 25 points pour un an, et 25 ou 50 pour deux ans ou plus.

**L’expérience de travail à l’étranger**, combinée à la langue ou à l’expérience canadienne :

- Un ou deux ans de travail à l’étranger rapportent 13 points avec le NCLC 7 dans chaque compétence, ou 25 au NCLC 9.
- Trois ans ou plus rapportent 25 points au NCLC 7 et 50 au NCLC 9.
- Le travail à l’étranger combiné au travail au Canada rapporte de 13 à 50 points selon la durée de chacun.

**Certificat de compétence** dans un métier : 25 points avec le NCLC 5 ou plus dans chaque compétence, ou 50 avec le NCLC 7 ou plus.

Pour la transférabilité, c’est votre compétence la **plus faible** qui compte. Une seule note plus basse, par exemple l’expression écrite au NCLC 8 alors que tout le reste est au NCLC 9, vous fait descendre au palier inférieur pour toutes les combinaisons qui dépendent de la langue.

## D. Points supplémentaires

| Facteur | Points |
|---|---|
| Désignation provinciale ou territoriale | 600 |
| Français au NCLC 7 ou plus dans les quatre compétences, et anglais au NCLC 5 ou plus | 50 |
| Français au NCLC 7 ou plus, et anglais au NCLC 4 ou moins (ou aucun test d’anglais) | 25 |
| Études postsecondaires au Canada, trois ans ou plus | 30 |
| Études postsecondaires au Canada, un ou deux ans | 15 |
| Un frère ou une sœur au Canada, citoyen ou résident permanent | 15 |

**Les offres d’emploi ne donnent plus de points.** IRCC a retiré les 50 et 200 points pour un emploi réservé le 25 mars 2025. Une offre d’emploi peut encore compter pour l’admissibilité à certains programmes, mais elle ne change pas votre score CRS.

La section des points supplémentaires est plafonnée à 600 : une désignation provinciale à elle seule la porte donc à son maximum.

## Exemple 1 : personne seule, 29 ans, baccalauréat, NCLC 9

Une personne seule de 29 ans, titulaire d’un baccalauréat, au NCLC 9 dans les quatre compétences en anglais, avec trois ans de travail qualifié à l’étranger et aucune expérience au Canada :

${exTable(exA)}

L’essentiel du score vient de l’âge, des études et de la langue. La transférabilité des compétences ajoute ${exAskill} points : le baccalauréat avec le NCLC 9 en rapporte 25 (un seul diplôme plafonne à 25 sans expérience canadienne), et trois ans de travail à l’étranger avec le NCLC 9 rapportent le maximum de 50 pour ce groupe.

## Exemple 2 : couple, 33 ans, maîtrise, un an au Canada

Une personne de 33 ans, titulaire d’une maîtrise, au NCLC 10 dans toutes les compétences, avec un an de travail à l’étranger et un an de travail au Canada. Son conjoint a un baccalauréat, le NCLC 7 en anglais et aucune expérience au Canada :

${exTable(exB)}

Le conjoint ajoute ses propres points, mais les facteurs de base du demandeur principal sont notés sur l’échelle « avec conjoint », plus basse. Pour certains couples, c’est le conjoint au meilleur profil qui devrait être le demandeur principal. Il vaut la peine de faire le calcul dans les deux sens.

## À quoi sert le score

Un score n’a pas de note de passage en soi. Chaque ronde d’invitations fixe un score minimal : celui de la dernière personne invitée. Les rondes sont soit générales, soit limitées à un programme ou à une catégorie (par exemple la Catégorie de l’expérience canadienne, la compétence linguistique en français ou les soins de santé), et les scores minimaux varient beaucoup de l’une à l’autre. Consultez les [types de tirages Entrée express](/express-entry-draws) pour savoir ce qu’exigeaient les rondes récentes, ou l’[historique complet des tirages](/draws).

Si plusieurs candidats ont le même score au seuil, IRCC applique la règle de départage : la date et l’heure de soumission du profil, le profil le plus ancien étant invité en premier.

## Sources

- IRCC, [Critères du Système de classement global](${LINKS.crsGrid}) (en anglais)
- IRCC, [Rondes d’invitations d’Entrée express](${LINKS.eeRounds}) (en anglais)

Ce guide est un résumé en langage simple. La grille d’IRCC fait autorité, et votre score officiel est celui qui figure dans votre profil Entrée express.
`),
  });

  // =================================================================== improve
  guides.push({
    file: 'improve-crs-score', path: '/improve-crs-score', priority: '0.8',
    title: L('How to Improve Your CRS Score: What Each Change Is Worth', "Comment améliorer votre score CRS : ce que vaut chaque changement"),
    description: L('Practical ways to raise an Express Entry CRS score, from language retests and French to Canadian work and nominations, each with the points it adds.', "Des moyens concrets d’augmenter un score CRS d’Entrée express, du test de langue au français, à l’expérience canadienne et aux désignations, avec les points que chacun ajoute."),
    llm: 'Ranked ways to raise a CRS score, each with the exact points gained for a sample profile computed by the site calculator.',
    short: L('What actually moves a CRS score, measured in points', "Ce qui fait vraiment bouger un score CRS, en points"),
    related: ['crs-points', 'language-tests-clb', 'express-entry-draws'],
    md: L(`# How to improve your CRS score

If your score sits below recent cutoffs, the useful question is which change gives the most points for the effort. This guide measures each option against one sample profile, using the same calculator that runs on the [CRS calculator](/crs-calculator).

**The sample profile:** single, 29 years old, a bachelor's degree, CLB 9 in all four English abilities, three years of skilled work abroad, no Canadian experience. That profile scores **${base}**.

## What each change is worth

${table(['Change', 'Points added', 'New score'], deltas.map(([l, d]) => [l, `+${d}`, base + d]))}

The numbers are for this profile only. The same change can be worth more or less for you, because several factors interact. Run your own profile in the [calculator](/crs-calculator) before you commit time or money to one route.

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

A provincial or territorial nomination adds 600 points, which in practice guarantees an invitation in the next nominee round. Provinces run their own streams with their own criteria, often tied to an occupation, a job offer, or ties to the province. See the [BC PNP](/bc-pnp-calculator) and [Saskatchewan](/sinp-calculator) calculators.

## What no longer works

**Job offers.** Arranged employment used to add 50 or 200 points. IRCC removed those points on March 25, 2025, so a job offer no longer changes your CRS score.

**Age** cannot be improved, and your score is recalculated as you get older: from 30, each birthday costs points. That makes the other levers more urgent, not less.

## Sources

- IRCC, [Comprehensive Ranking System criteria](${LINKS.crsGrid})
- IRCC, [Language testing for Express Entry](${LINKS.langTests})
`, `# Comment améliorer votre score CRS

Si votre score est sous les scores minimaux récents, la bonne question est de savoir quel changement rapporte le plus de points pour l’effort. Ce guide mesure chaque option sur un même profil type, avec le calculateur qui fait tourner le [calculateur CRS](/crs-calculator).

**Le profil type :** personne seule de 29 ans, titulaire d’un baccalauréat, au NCLC 9 dans les quatre compétences en anglais, avec trois ans de travail qualifié à l’étranger et aucune expérience au Canada. Ce profil obtient **${base}**.

## Ce que vaut chaque changement

${table(['Changement', 'Points ajoutés', 'Nouveau score'], deltas.map(([l, d]) => [l, `+${d}`, base + d]))}

Ces chiffres ne valent que pour ce profil. Le même changement peut valoir plus ou moins pour vous, car plusieurs facteurs interagissent. Calculez votre propre profil dans le [calculateur](/crs-calculator) avant d’investir du temps ou de l’argent dans une voie.

## 1. Repassez votre test de langue

La langue est souvent le levier le plus rapide, car elle compte deux fois : une fois dans le score de base, et une autre dans la transférabilité des compétences, qui regarde votre compétence la plus faible.

- Passer du NCLC 9 au NCLC 10 dans chaque compétence vaut **+${deltas[0][1]}** pour le profil type.
- Le coût d’une compétence faible est plus grand. Le même profil au NCLC 8 au lieu du NCLC 9 obtient ${clb8}, soit **${base - clb8} points de moins**, surtout parce que le NCLC 9 est le seuil du palier supérieur de transférabilité.

Commencez par votre note la plus basse. Une seule compétence au NCLC 8 freine toutes les combinaisons qui dépendent de la langue. Les [tableaux de conversion en NCLC](/language-tests-clb) donnent le résultat exact à obtenir à l’IELTS, au CELPIP, au PTE Core, au TEF ou au TCF.

## 2. Apprenez le français

Le français est le plus gros bonus que la plupart des gens peuvent obtenir sans désignation. Le français au NCLC 7 ou plus dans les quatre compétences ajoute 50 points supplémentaires si votre anglais est au moins au NCLC 5, en plus des points de deuxième langue. Pour le profil type, cela fait **+${deltas[2][1]}** au total.

Le français donne aussi accès aux rondes de compétence linguistique en français, qu’IRCC tient régulièrement avec des scores minimaux bien plus bas que les rondes générales. Voir les [types de tirages](/express-entry-draws).

## 3. Acquérez de l’expérience de travail au Canada

Un an de travail qualifié au Canada ajoute des points de base et débloque des combinaisons de transférabilité : **+${deltas[3][1]}** pour un an et **+${deltas[4][1]}** pour deux ans pour le profil type. L’expérience canadienne vous rend aussi admissible à la Catégorie de l’expérience canadienne, qui a ses propres rondes.

## 4. Ajoutez un diplôme

Une maîtrise, ou un deuxième diplôme dont l’un dure au moins trois ans, vous fait monter d’un palier à la fois pour les études et pour la transférabilité. Pour le profil type, une maîtrise au lieu d’un baccalauréat ajoute **+${deltas[5][1]}**. Assurez-vous que tout nouveau diplôme étranger est couvert par une EDE.

Étudier au Canada ajoute 15 points pour un programme d’un ou deux ans et 30 pour trois ans ou plus, en plus du facteur études.

## 5. Vérifiez le profil de votre conjoint

Si votre époux ou conjoint de fait vous accompagne :

- Son test de langue peut ajouter jusqu’à 20 points, et ses études et son expérience canadienne jusqu’à 10 chacune.
- Faites le calcul avec chacun de vous comme demandeur principal. Le meilleur profil comme demandeur principal peut valoir des dizaines de points.
- Si votre conjoint ne vous accompagne pas, ou s’il est déjà citoyen ou résident permanent, vous êtes noté comme une personne seule.

## 6. Comptez tout ce que vous avez déjà

Bien des points sont oubliés plutôt que manquants :

- **Un frère ou une sœur au Canada**, citoyen ou résident permanent, vaut 15 points.
- **Deux diplômes** (par exemple un diplôme collégial et un baccalauréat) peuvent valoir plus que le plus élevé seul, si l’un d’eux dure au moins trois ans.
- **Un certificat de compétence** dans un métier ajoute des points de transférabilité.
- **L’expérience de travail** continue de s’accumuler. Mettez votre profil à jour quand vous franchissez une année, car les points ne se mettent pas à jour seuls.

## 7. Visez une désignation provinciale

Une désignation provinciale ou territoriale ajoute 600 points, ce qui garantit en pratique une invitation à la prochaine ronde du Programme des candidats des provinces. Les provinces ont leurs propres volets et critères, souvent liés à une profession, à une offre d’emploi ou à des liens avec la province. Voir les calculateurs du [BC PNP](/bc-pnp-calculator) et de la [Saskatchewan](/sinp-calculator).

## Ce qui ne fonctionne plus

**Les offres d’emploi.** Un emploi réservé ajoutait 50 ou 200 points. IRCC a retiré ces points le 25 mars 2025 : une offre d’emploi ne change donc plus votre score CRS.

**L’âge** ne s’améliore pas, et votre score est recalculé à mesure que vous vieillissez : à partir de 30 ans, chaque anniversaire coûte des points. Les autres leviers n’en sont que plus urgents.

## Sources

- IRCC, [Critères du Système de classement global](${LINKS.crsGrid}) (en anglais)
- IRCC, [Examens linguistiques pour Entrée express](${LINKS.langTests}) (en anglais)
`),
  });

  // =================================================================== CLB conversion
  guides.push({
    file: 'language-tests-clb', path: '/language-tests-clb', priority: '0.8',
    title: L('IELTS, CELPIP, PTE Core, TEF & TCF to CLB: Conversion Tables', "IELTS, CELPIP, PTE Core, TEF et TCF en NCLC : tableaux de conversion"),
    description: L('Convert IELTS, CELPIP, PTE Core, TEF Canada and TCF Canada scores to Canadian Language Benchmark levels, with the CLB you need for Express Entry.', "Convertissez vos résultats IELTS, CELPIP, PTE Core, TEF Canada et TCF Canada en Niveaux de compétence linguistique canadiens, avec les NCLC exigés pour Entrée express."),
    llm: 'Minimum score per CLB level (4 to 10) for each accepted Express Entry language test and ability, plus the CLB levels that matter for eligibility and CRS.',
    short: L('Convert any accepted test score to a CLB level', "Convertir un résultat de test accepté en NCLC"),
    related: ['crs-points', 'improve-crs-score', 'fsw-67-points'],
    md: L(`# Language test scores to CLB: conversion tables

Express Entry does not use test scores directly. IRCC converts each ability (reading, writing, listening, speaking) to a **Canadian Language Benchmark** level, or **NCLC** for French. Your CRS points, your eligibility and the transferability bonuses all depend on those levels.

The tables below give the minimum score for each level. They are the same thresholds the [CRS calculator](/crs-calculator) uses.

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
`, `# Résultats de tests de langue en NCLC : tableaux de conversion

Entrée express n’utilise pas directement les résultats de test. IRCC convertit chaque compétence (compréhension de l’écrit, expression écrite, compréhension de l’oral, expression orale) en **Niveau de compétence linguistique canadien (NCLC)**, appelé CLB en anglais. Vos points CRS, votre admissibilité et les points de transférabilité dépendent tous de ces niveaux.

Les tableaux ci-dessous donnent le résultat minimal pour chaque niveau. Ce sont les mêmes seuils que ceux du [calculateur CRS](/crs-calculator).

## Les tests acceptés

| Langue | Test | Échelle |
|---|---|---|
| Anglais | CELPIP-General | Niveaux 1 à 12 |
| Anglais | ${TESTS.ielts.name} | Notes de 0 à 9 |
| Anglais | ${TESTS.pte.name} | Notes de 10 à 90 |
| Français | TEF Canada | Notes de 0 à 699 |
| Français | ${TESTS.tcf.name} | Compréhension de 0 à 699, expression de 0 à 20 |

Les résultats sont valides deux ans à partir de la date du test, et ils doivent l’être encore le jour où vous présentez votre demande de résidence permanente, pas seulement quand vous créez votre profil. L’IELTS Academic et le PTE Academic ne sont pas acceptés pour Entrée express.

## CELPIP-General

Le CELPIP est construit sur l’échelle des NCLC : la conversion est directe. Un niveau CELPIP de 9 correspond au NCLC 9 pour cette compétence, jusqu’au NCLC 10 ou plus à partir du niveau 10.

## IELTS General Training

${clbTable(TESTS.ielts)}

## PTE Core

${clbTable(TESTS.pte)}

## TEF Canada

Ces seuils s’appliquent aux tests passés le 10 décembre 2023 ou après. Les résultats TEF plus anciens suivent d’autres tableaux, que le calculateur prend aussi en charge.

${clbTable(TESTS.tef)}

## TCF Canada

${clbTable(TESTS.tcf)}

## Les niveaux NCLC qui comptent

- **NCLC 7 dans chaque compétence** est le minimum pour le Programme des travailleurs qualifiés (fédéral), et le premier palier de la plupart des points de transférabilité.
- **NCLC 9 dans chaque compétence** débloque le palier supérieur de transférabilité. Pour bien des profils, ce seuil vaut plus que toute autre amélioration. Voir [comment améliorer votre score CRS](/improve-crs-score).
- **NCLC 10** donne le plus de points de langue de base : 34 par compétence pour une personne seule.
- **NCLC 7 (ou 5 pour certains emplois)** est le minimum pour la Catégorie de l’expérience canadienne, selon la catégorie FEER de l’emploi.
- **NCLC 7 en français** rapporte 25 ou 50 points supplémentaires.

Chaque compétence est convertie séparément, et la transférabilité utilise la plus faible. Un profil à 10, 10, 10 et 8 est traité comme NCLC 8 pour la transférabilité.

## Sources

- IRCC, [Examens linguistiques pour Entrée express](${LINKS.langTests}) (en anglais)

Les organismes de test et IRCC révisent parfois les équivalences. Si la date de votre test est proche d’un changement, vérifiez sur le site d’IRCC le tableau qui s’applique à vous.
`),
  });

  // =================================================================== FSW 67 points
  const fswAges = [36, 37, 40, 45, 46, 47];
  guides.push({
    file: 'fsw-67-points', path: '/fsw-67-points', priority: '0.7',
    title: L('FSW 67 Points Explained: The Federal Skilled Worker Grid', "Les 67 points du PTQF expliqués : la grille des travailleurs qualifiés"),
    description: L('How the Federal Skilled Worker 67-point grid works: language, education, experience, age, arranged employment and adaptability, plus the minimum requirements.', "Comment fonctionne la grille de 67 points du Programme des travailleurs qualifiés (fédéral) : langue, études, expérience, âge, emploi réservé et adaptabilité, plus les exigences minimales."),
    llm: 'The six FSW selection factors with their point values and the minimum requirements (CLB 7, one year of continuous skilled work, ECA, proof of funds).',
    short: L('The six selection factors and the minimum requirements', "Les six facteurs de sélection et les exigences minimales"),
    related: ['crs-points', 'language-tests-clb', 'express-entry-process'],
    md: L(`# The FSW 67-point grid, explained

The Federal Skilled Worker Program (FSW) is one of the three programs that feed the Express Entry pool. Before you can enter the pool under FSW, you must score at least **67 out of 100** on its six selection factors. This is a pass/fail check, separate from the CRS score that ranks you once you are in.

You can run the grid in the [FSW calculator](/fsw-calculator).

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
`, `# La grille de 67 points du PTQF, expliquée

Le Programme des travailleurs qualifiés (fédéral) (PTQF) est l’un des trois programmes qui alimentent le bassin d’Entrée express. Pour entrer dans le bassin au titre du PTQF, vous devez obtenir au moins **67 points sur 100** aux six facteurs de sélection. C’est un critère éliminatoire, distinct du score CRS qui vous classe une fois dans le bassin.

Vous pouvez faire le calcul avec le [calculateur PTQF](/fsw-calculator).

## Exigences minimales

Même avec 67 points, vous devez aussi avoir :

- **Un an d’expérience de travail qualifié continue**, à temps plein (ou l’équivalent à temps partiel), au cours des dix dernières années, dans une seule profession de catégorie FEER 0, 1, 2 ou 3 de la CNP.
- **Le NCLC 7 dans les quatre compétences** de votre première langue officielle. Voir les [tableaux de conversion en NCLC](/language-tests-clb).
- **Une évaluation des diplômes d’études** pour les études faites hors du Canada.
- **Une preuve de fonds** pour subvenir à vos besoins et à ceux de votre famille, sauf si vous êtes autorisé à travailler au Canada et avez une offre d’emploi valide. IRCC met les montants à jour chaque année ; voir sa [page sur la preuve de fonds](${LINKS.funds}) (en anglais).

## Les six facteurs

${table(['Facteur', 'Points maximum'], [['Compétences linguistiques', 28], ['Études', 25], ['Expérience de travail', 15], ['Âge', 12], ['Emploi réservé au Canada', 10], ['Adaptabilité', 10], ['**Total**', '**100**']])}

### 1. Langue (jusqu’à 28)

Votre première langue officielle rapporte des points par compétence : 6 au NCLC 9 ou plus, 5 au NCLC 8 et 4 au NCLC 7, jusqu’à 24. Sous le NCLC 7 dans une compétence, vous n’êtes pas admissible. Une deuxième langue officielle au NCLC 5 ou plus dans les quatre compétences ajoute 4 points.

### 2. Études (jusqu’à 25)

${table(['Diplôme', 'Points'], [['Doctorat', 25], ['Maîtrise ou diplôme professionnel', 23], ['Deux diplômes ou plus, dont un d’au moins trois ans', 22], ['Diplôme de trois ans ou plus', 21], ['Programme postsecondaire de deux ans', 19], ['Programme postsecondaire d’un an', 15], ['Diplôme d’études secondaires', 5]])}

### 3. Expérience de travail (jusqu’à 15)

${table(['Années de travail qualifié', 'Points'], [['1 an', 9], ['2 à 3 ans', 11], ['4 à 5 ans', 13], ['6 ans ou plus', 15]])}

### 4. Âge (jusqu’à 12)

L’âge rapporte 12 points de 18 à 35 ans, puis un point de moins par année après 35 ans, jusqu’à zéro à 47 ans.

${table(['Âge', 'Points'], [['Moins de 18 ans', 0], ['18 à 35 ans', FSW_AGE(35)], ...fswAges.map((a) => [a === 47 ? '47 ans ou plus' : `${a} ans`, FSW_AGE(a)])])}

### 5. Emploi réservé (10)

Une offre d’emploi valide d’au moins un an, d’un employeur canadien, dans une profession qualifiée, rapporte 10 points. C’est distinct du CRS, où les offres d’emploi ne donnent plus de points.

### 6. Adaptabilité (jusqu’à 10)

Toute combinaison des éléments suivants, plafonnée à 10 :

- Votre propre travail qualifié antérieur au Canada (au moins un an) : 10
- Vos propres études à temps plein antérieures au Canada (au moins deux ans) : 5
- Un emploi réservé au Canada : 5
- Un membre de la famille au Canada, citoyen ou résident permanent : 5
- La langue de votre époux ou conjoint de fait au NCLC 4 ou plus : 5
- Les études antérieures de votre conjoint au Canada : 5
- Le travail antérieur de votre conjoint au Canada : 5

## Un exemple

Une personne de 31 ans, titulaire d’un baccalauréat, au NCLC 8 dans toutes les compétences, avec trois ans de travail qualifié et aucun lien avec le Canada obtient 20 (langue) + 21 (études) + 11 (expérience) + 12 (âge) = **64**. C’est moins que 67. Monter une compétence au NCLC 9 n’ajoute qu’un point, mais passer les quatre au NCLC 9 donne 24 pour la langue et un total de **68**, qui passe.

## PTQF ou CRS

Réussir la grille de 67 points vous fait seulement entrer dans le bassin. Votre rang dans le bassin, et donc votre invitation, dépend entièrement du [score CRS](/crs-points).

## Sources

- IRCC, [Six facteurs de sélection : Programme des travailleurs qualifiés (fédéral)](${LINKS.fswFactors}) (en anglais)
- IRCC, [Preuve de fonds](${LINKS.funds}) (en anglais)
`),
  });

  // =================================================================== draw types
  guides.push({
    file: 'express-entry-draws', path: '/express-entry-draws', priority: '0.8',
    title: L('Draw Types in Express Entry: CEC, PNP, French & Category Rounds', "Types de rondes d’Entrée express : CEC, PCP, français et catégories"),
    description: L('What each kind of Express Entry round means, who qualifies, and the CRS cutoffs recent rounds of each type needed, from IRCC data.', "Ce que signifie chaque type de ronde d’Entrée express, qui peut être invité, et les scores CRS minimaux des rondes récentes de chaque type, d’après les données d’IRCC."),
    llm: 'The kinds of Express Entry rounds (general, program-specific, category-based, PNP) with per-category cutoff ranges and invitation counts from recent IRCC rounds.',
    short: L('What each round type means and what it needed', "Ce que veut dire chaque type de ronde et ce qu’il exigeait"),
    related: ['crs-points', 'improve-crs-score', 'express-entry-process'],
    md: L(`# Express Entry draw types, explained

> **Looking for the latest draw?** Round #${last.number} on ${last.dateFull} was ${last.label}: ${fmt(last.size)} invitations, cutoff ${last.crs}. See [the latest Express Entry draws](/draws) for every round and its CRS cutoff.

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
`, `# Les types de tirages Entrée express, expliqués

> **Vous cherchez le dernier tirage ?** La ronde n° ${last.number}, le ${dateOf(last)}, était : ${T(last.label)}, ${fmt(last.size)} invitations, score minimal de ${last.crs}. Consultez [les derniers tirages Entrée express](/draws) pour chaque ronde et son score minimal.

IRCC invite les candidats du bassin d’Entrée express lors de **rondes d’invitations**, souvent appelées tirages. Chaque ronde a un type, un nombre d’invitations et un score minimal : le score CRS de la personne la moins bien classée qui a été invitée. C’est le type qui détermine qui peut être invité, ce qui explique pourquoi les scores minimaux varient tant d’une ronde à l’autre.

Les chiffres de cette page couvrent les ${rows.length} rondes les plus récentes d’IRCC, ${span}. Pour chaque ronde, consultez l’[historique des tirages](/draws) et l’[analyse des tirages](/analytics).

## Les types de rondes

**Les rondes générales** visent tout le bassin, peu importe le programme. À part les rondes des candidats des provinces, ce sont généralement celles où le score minimal est le plus élevé.

**Les rondes propres à un programme** n’invitent que les candidats admissibles à un programme :

- **Catégorie de l’expérience canadienne (CEC) :** au moins un an de travail qualifié au Canada.
- **Programme des candidats des provinces (PCP) :** candidats qui ont déjà une désignation provinciale ou territoriale. Les scores minimaux sont élevés parce que la désignation ajoute 600 points.
- **Programme des travailleurs de métiers spécialisés (fédéral) :** candidats admissibles au programme des métiers.

**Les rondes de sélection par catégorie** existent depuis 2023. Elles visent les candidats qui ont un attribut précis, en général une profession ou la maîtrise du français, peu importe leur rang global. IRCC fixe les catégories chaque année ; les plus récentes incluent la compétence linguistique en français, les soins de santé et services sociaux, les métiers et les professions du transport. Consultez la [page d’IRCC sur la sélection par catégorie](${LINKS.categories}) (en anglais) pour la liste à jour et les professions visées.

## Ce qu’exigeaient les rondes récentes

${table(['Type de ronde', 'Rondes', 'Score minimal le plus bas', 'Score minimal le plus haut', 'Invitations'], catRows.map((c) => [T(c.label), c.n, c.min, c.max, fmt(c.itas)]))}

La ronde la plus récente est la n° ${last.number}, le ${dateOf(last)} : ${T(last.label)}, ${fmt(last.size)} invitations, score minimal de ${last.crs}.

## Lire le tableau

- **Un score minimal bas dans une catégorie n’en est un pour vous** que si vous êtes admissible à cette catégorie. Les rondes par catégorie vérifient la profession et l’expérience de votre profil, ou vos résultats de test en français.
- **Les scores minimaux des PCP semblent élevés**, mais ils incluent les 600 points de la désignation.${pnp ? ` Sans elle, les scores minimaux de ces rondes allaient de ${pnp.min - 600} à ${pnp.max - 600}.` : ''}
- **De petits échantillons.** Certains types n’ont eu lieu qu’une ou deux fois pendant la période. Une seule ronde en dit peu sur la suivante.

## Où se situe le bassin

Le bassin comptait ${fmt(poolTotal)} profils${FEED.distributionAsOf ? ` au ${frDate(`${FEED.distributionAsOf} 12:00 UTC`)}` : ''}. La répartition par tranche de score :

${table(['Tranche CRS', 'Profils'], FEED.pool.map((b) => [b.label, fmt(b.count)]))}

En comparant votre score à ce tableau, vous voyez combien de candidats sont classés devant vous dans une ronde générale.

## La règle de départage

Quand plusieurs candidats ont exactement le score minimal, IRCC invite ceux dont le profil a été soumis le plus tôt, selon la date et l’heure. L’heure de départage de chaque ronde est publiée avec les résultats.

## Après une invitation

Une invitation à présenter une demande vous donne 60 jours pour soumettre une demande de résidence permanente complète. Consultez le [processus d’Entrée express](/express-entry-process) pour la suite.

## Sources

- IRCC, [Rondes d’invitations d’Entrée express](${LINKS.eeRounds}) (en anglais)
- IRCC, [Sélection par catégorie](${LINKS.categories}) (en anglais)

Les données des rondes sur ce site sont reprises du flux publié par IRCC et mises à jour automatiquement à chaque nouvelle ronde.
`),
  });

  // =================================================================== process
  guides.push({
    file: 'express-entry-process', path: '/express-entry-process', priority: '0.8',
    title: L('Express Entry Process Step by Step: From Profile to PR', "Le processus d’Entrée express étape par étape : du profil à la RP"),
    description: L('The Express Entry process in order: eligibility, language test, ECA, profile, ITA, application, biometrics, medical and confirmation of PR.', "Le processus d’Entrée express dans l’ordre : admissibilité, test de langue, EDE, profil, IPD, demande, biométrie, examen médical et confirmation de résidence permanente."),
    llm: 'The Express Entry sequence from eligibility checks through profile, ITA, e-APR, AOR, biometrics, medical, background check and COPR, with deadlines at each step.',
    short: L('Every step from eligibility to landing, with deadlines', "Chaque étape, de l’admissibilité à l’arrivée, avec les délais"),
    related: ['crs-points', 'fsw-67-points', 'express-entry-draws'],
    md: L(`# The Express Entry process, step by step

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
`, `# Le processus d’Entrée express, étape par étape

Entrée express est le système en ligne d’IRCC pour trois programmes d’immigration économique : le **Programme des travailleurs qualifiés (fédéral)**, la **Catégorie de l’expérience canadienne** et le **Programme des travailleurs de métiers spécialisés (fédéral)**. Les provinces peuvent aussi désigner des candidats du bassin. Ce guide présente chaque étape dans l’ordre, avec les délais qui s’appliquent. Notez vos propres dates dans la [chronologie de votre demande](/timeline).

## Avant de créer un profil

### 1. Vérifiez à quel programme vous correspondez

- **Travailleurs qualifiés (fédéral) :** au moins un an de travail qualifié continu au cours des dix dernières années, le NCLC 7 dans chaque compétence et 67 points sur la [grille du PTQF](/fsw-67-points).
- **Catégorie de l’expérience canadienne :** au moins un an de travail qualifié au Canada au cours des trois dernières années, avec le NCLC 7 (emplois FEER 0 et 1) ou le NCLC 5 (emplois FEER 2 et 3).
- **Métiers spécialisés (fédéral) :** au moins deux ans d’expérience dans un métier au cours des cinq dernières années, plus une offre d’emploi ou un certificat de compétence canadien.

La [page d’IRCC sur l’admissibilité](${LINKS.eeEligibility}) (en anglais) présente tous les critères.

### 2. Passez un test de langue approuvé

Les tests acceptés sont le CELPIP-General, l’IELTS General Training et le PTE Core pour l’anglais, et le TEF Canada et le TCF Canada pour le français. Les résultats sont valides deux ans. Voir les [tableaux de conversion en NCLC](/language-tests-clb).

### 3. Faites évaluer vos diplômes

Si vous avez étudié hors du Canada, une évaluation des diplômes d’études (EDE) faite par un organisme désigné confirme ce que vaut votre diplôme au Canada. Une EDE est valide cinq ans. Sans elle, vos études à l’étranger ne rapportent aucun point CRS.

### 4. Vérifiez votre preuve de fonds

Les candidats du PTQF et du Programme des travailleurs de métiers spécialisés (fédéral) doivent prouver qu’ils ont des fonds d’établissement, sauf s’ils sont autorisés à travailler au Canada et ont une offre d’emploi valide. Les candidats de la CEC en sont exemptés. Les montants sont mis à jour chaque année sur la [page d’IRCC sur la preuve de fonds](${LINKS.funds}) (en anglais).

## Dans le bassin

### 5. Créez votre profil Entrée express

Vous entrez vos renseignements dans votre compte IRCC. Si vous êtes admissible, vous entrez dans le bassin avec un score CRS. Un profil est valide **12 mois** ; ensuite, vous devez en créer un nouveau.

Tenez-le à jour. Un nouveau résultat de test, une année de travail de plus ou un changement de situation familiale peut changer votre score.

### 6. Attendez une invitation à présenter une demande

IRCC tient des rondes régulièrement. Si votre score atteint le score minimal d’une ronde à laquelle vous êtes admissible, vous recevez une IPD dans votre compte. Voir les [types de tirages](/express-entry-draws) pour le fonctionnement des rondes.

## Après l’invitation

### 7. Présentez votre demande dans les 60 jours

Vous avez **60 jours** après l’IPD pour soumettre une demande de résidence permanente électronique avec tous les documents à l’appui : certificats de police, preuves d’expérience de travail, pièces d’identité et, au besoin, preuve de fonds. Les renseignements doivent correspondre à votre profil. Si, après correction, votre score passait sous le score minimal de la ronde, vous pourriez ne plus être admissible.

Préparez-vous avec les [listes de documents](/checklists). Les certificats de police peuvent prendre des mois dans certains pays : bien des candidats les demandent avant de recevoir l’IPD.

### 8. Accusé de réception (AR)

IRCC confirme qu’il a reçu votre demande. Le délai de traitement est calculé à partir de ce moment.

### 9. Données biométriques

Vous recevez une lettre d’instructions sur la biométrie et devez donner vos empreintes digitales et une photo dans les **30 jours**, sauf si vous l’avez déjà fait au cours des dix dernières années et qu’elles sont encore valides.

### 10. Examen médical

Vous et les membres de votre famille passez un examen médical aux fins de l’immigration auprès d’un médecin désigné par IRCC, si ce n’est pas déjà fait.

### 11. Vérifications d’admissibilité et de sécurité

IRCC vérifie votre admissibilité, votre interdiction de territoire éventuelle et la sécurité. Il peut demander d’autres documents. Répondez avant la date limite indiquée dans la demande.

### 12. Décision finale et confirmation de résidence permanente

Si votre demande est acceptée, on vous demande votre passeport ou des renseignements pour le portail, puis vous recevez une **confirmation de résidence permanente (CRP)**. Si vous êtes à l’extérieur du Canada, vous obtenez un visa de résident permanent pour voyager. Vous devenez résident permanent une fois les formalités d’arrivée terminées.

## Combien de temps ça prend

La norme de service d’IRCC est de traiter la plupart des demandes Entrée express complètes en environ six mois après leur réception. Les délais réels varient ; consultez les [délais de traitement](/processing-times) actuels.

## Sources

- IRCC, [Qui peut présenter une demande : Entrée express](${LINKS.eeEligibility}) (en anglais)
- IRCC, [Preuve de fonds](${LINKS.funds}) (en anglais)
- IRCC, [Examens linguistiques](${LINKS.langTests}) (en anglais)
`),
  });

  // =================================================================== hub
  const hub = {
    file: 'guides', path: '/guides', priority: '0.8',
    title: L('Express Entry Guides: CRS Points, Draws, Language & Process', "Guides Entrée express : points CRS, tirages, langue et processus"),
    description: L('Plain-language Express Entry guides: how the CRS score works, how to raise it, language test conversions, the FSW grid, draw types and the full process.', "Des guides Entrée express en langage simple : comment fonctionne le score CRS, comment l’augmenter, la conversion des tests de langue, la grille du PTQF, les types de tirages et tout le processus."),
    llm: 'Index of the long-form Express Entry guides on this site.',
    related: [],
    hub: true,
  };
  hub.md = L(`# Express Entry guides

Plain-language guides to Canada's Express Entry system, written to sit alongside the calculators and live draw data on this site. Every table on these pages is generated from the same data the calculators use, so the numbers stay in step.

${guides.map((g) => `## [${g.title.replace(/\s*:.*$/, '')}](${g.path})\n\n${g.description}`).join('\n\n')}

## Tools that go with them

- Calculators: [CRS](/crs-calculator), [FSW 67-point](/fsw-calculator), [BC PNP SIRS](/bc-pnp-calculator) and [Saskatchewan SINP](/sinp-calculator)
- [Latest Express Entry draws](/draws) and [draw analytics](/analytics)
- [IRCC processing times](/processing-times)
- [Document checklists](/checklists) and the [application timeline](/timeline)
`, `# Guides Entrée express

Des guides en langage simple sur le système Entrée express du Canada, conçus pour accompagner les calculateurs et les données de tirages en direct de ce site. Chaque tableau de ces pages est produit à partir des mêmes données que les calculateurs, pour que les chiffres restent cohérents.

${guides.map((g) => `## [${g.title.replace(/\s*:.*$/, '')}](${g.path})\n\n${g.description}`).join('\n\n')}

## Les outils qui les accompagnent

- Calculateurs : [CRS](/crs-calculator), [PTQF 67 points](/fsw-calculator), [SIRS du BC PNP](/bc-pnp-calculator) et [SINP de la Saskatchewan](/sinp-calculator)
- [Derniers tirages Entrée express](/draws) et [analyse des tirages](/analytics)
- [Délais de traitement d’IRCC](/processing-times)
- [Listes de documents](/checklists) et [chronologie de la demande](/timeline)
`);

  // =================================================================== about
  const about = {
    file: 'about', path: '/about', priority: '0.5',
    title: L('About CRS Pulse — Who We Are and Where Our Data Comes From', "À propos de CRS Pulse : qui nous sommes et d’où viennent nos données"),
    description: L('What CRS Pulse is, who makes it, where its draw and processing-time data comes from, how it is funded, and how to contact us or report a correction.', "Ce qu’est CRS Pulse, qui le fait, d’où viennent ses données sur les tirages et les délais de traitement, comment il est financé, et comment nous joindre ou signaler une correction."),
    llm: 'Who publishes CRS Pulse, the data sources behind every figure, how the site is funded, and how to send corrections.',
    related: [],
    about: true,
    md: L(`# About CRS Pulse

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
`, `# À propos de CRS Pulse

CRS Pulse est une boîte à outils gratuite pour les personnes qui demandent à immigrer au Canada par Entrée express. Elle comprend une appli iPhone et ce site, avec des calculateurs pour le score CRS, la grille de 67 points du PTQF, le SIRS du BC PNP et le SINP de la Saskatchewan, les résultats des tirages d’IRCC en direct, les délais de traitement, des listes de documents et des guides.

## Qui le fait

CRS Pulse est conçu et maintenu par un développeur indépendant. Il n’est **pas** affilié à Immigration, Réfugiés et Citoyenneté Canada (IRCC) ni à aucune autre partie du gouvernement du Canada, ni approuvé par eux, et ce n’est ni un cabinet d’avocats ni un cabinet de consultants en immigration autorisés.

## D’où viennent les données

- **Les rondes d’Entrée express et la répartition du bassin** viennent du flux des rondes d’invitations publié par IRCC sur canada.ca. Une tâche planifiée le copie dans le dépôt de ce site, et le site est reconstruit à chaque nouvelle ronde. La ronde la plus récente sur le site est la n° ${last.number}, du ${dateOf(last)}.
- **Les délais de traitement** viennent des données publiées par IRCC, actualisées régulièrement.
- **Les grilles de points** (CRS, PTQF, SIRS du BC PNP, SINP) suivent les critères officiels publiés par IRCC et les provinces. Chaque calculateur cite sa source.
- **Les guides** sont rédigés à partir des règles publiées par IRCC, et chacun de leurs tableaux est produit à partir des données des calculateurs. Chaque guide indique ses sources.

Quand IRCC change une règle, nous mettons à jour le calculateur et les guides ensemble. Si vous trouvez une information périmée, dites-le-nous.

## Comment il est financé

CRS Pulse est gratuit. L’appli affiche des annonces Google AdMob et le site peut afficher des annonces Google AdSense. Il n’y a ni formule payante, ni abonnement, ni achat intégré. Les annonces n’ont aucune influence sur les scores, les données ou le contenu des guides.

## Votre vie privée

Ce que vous entrez dans les calculateurs reste dans votre navigateur ou sur votre téléphone ; rien n’est téléversé. La [politique de confidentialité](/privacy) décrit exactement ce que l’appli et le site recueillent.

## Important

Les scores, prédictions et chronologies de CRS Pulse sont des estimations, à titre indicatif seulement. Ce ne sont pas des conseils juridiques ou en immigration. Avant d’agir, consultez les outils officiels d’IRCC sur canada.ca ou un professionnel autorisé.

## Contact et corrections

Écrivez à **[${CONTACT}](mailto:${CONTACT})** pour une question, une correction ou un bogue. Pour une correction, indiquez l’adresse de la page et, si possible, un lien vers la source officielle. L’appli iPhone est sur l’[App Store](${APP_STORE_URL}).
`),
  };

  return { guides, hub, about };
}
