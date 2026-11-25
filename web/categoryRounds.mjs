import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LANG, LOCALE } from './i18n.mjs';

// "Express Entry category rounds": every category-based round since the first one in
// June 2023, grouped by category, with how often each has run and the longest waits.
// The prose describes patterns (which categories ran every year, which have gone quiet,
// the growing share of invitations), so the data is frozen at AS_OF: later rounds must
// not quietly falsify the text. Every number is computed from data/ee-rounds-all.json,
// and the build fails if a claim the prose makes stops holding.
// Eligibility rules are deliberately not restated here: the article links to IRCC's
// category-based selection page for them. To refresh, move AS_OF, re-read the prose
// against the new numbers, and bump REVIEWED.
export const AS_OF = '2026-11-25';
const REVIEWED = '2026-11-25';
const START = '2023-06-01'; // category-based rounds began in June 2023

const here = dirname(fileURLToPath(import.meta.url));
const L = (en, fr) => (LANG === 'fr' ? fr : en);
const fmt = (n) => Number(n).toLocaleString(LOCALE);
const pct = (n) => (n > 0 && n < 0.005 ? L('<1%', '<1 %') : `${Math.round(n * 100)}${L('%', ' %')}`);
const day = (d) => new Date(`${d}T12:00:00Z`);
const longDate = (d) => day(d).toLocaleDateString(L('en-CA', 'fr-CA'), { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).replace(/^1 /, L('1 ', '1er '));
const monthYear = (d) => day(d).toLocaleDateString(L('en-CA', 'fr-CA'), { month: 'long', year: 'numeric', timeZone: 'UTC' });
const daysBetween = (a, b) => Math.round((day(b) - day(a)) / 86400000);
const median = (a) => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2); };
const table = (head, rows) =>
  [`| ${head.join(' | ')} |`, `| ${head.map(() => '---').join(' | ')} |`, ...rows.map((r) => `| ${r.join(' | ')} |`)].join('\n');
const check = (ok, what) => { if (!ok) throw new Error(`categoryRounds.mjs: the article says "${what}", which the data no longer supports`); };

// IRCC renames categories between versions ("Healthcare occupations (Version 1)",
// "Healthcare and social services occupations (Version 2)", "… 2026-Version 3"), so
// group by keyword. Physicians come before healthcare. The 2017–2020 Federal Skilled
// Trades rounds were program rounds, not category rounds, and START excludes them.
const CATS = [
  ['french', /french/i, 'French-language proficiency', 'Compétence linguistique en français'],
  ['physicians', /physician/i, 'Physicians with Canadian work experience', 'Médecins avec expérience de travail au Canada'],
  ['healthcare', /health/i, 'Healthcare and social services', 'Soins de santé et services sociaux'],
  ['stem', /\bstem\b/i, 'STEM', 'STIM'],
  ['trades', /trade/i, 'Trades', 'Métiers'],
  ['transport', /transport/i, 'Transport', 'Transport'],
  ['agriculture', /agri/i, 'Agriculture and agri-food', 'Agriculture et agroalimentaire'],
  ['education', /education/i, 'Education', 'Éducation'],
  ['managers', /senior manager/i, 'Senior managers with Canadian work experience', 'Cadres supérieurs avec expérience de travail au Canada'],
  ['military', /military/i, 'Skilled military recruits', 'Recrues militaires qualifiées'],
];
const catOf = (r) => (/federal skilled/i.test(r.name) ? null : (CATS.find(([, re]) => re.test(r.name)) ?? [null])[0]);
const catName = (k) => { const c = CATS.find(([key]) => key === k); return L(c[2], c[3]); };

export function buildCategoryRounds({ IRCC_ROUNDS, IRCC_CATEGORIES }) {
  const all = JSON.parse(readFileSync(resolve(here, '../data/ee-rounds-all.json'), 'utf8')).rounds
    .filter((r) => r.date >= START && r.date <= AS_OF).reverse(); // oldest first
  const rounds = all.map((r) => ({ ...r, cat: catOf(r) })).filter((r) => r.cat);
  const sum = (a) => a.reduce((n, r) => n + r.size, 0);
  const total = sum(rounds);
  const first = rounds[0], last = rounds[rounds.length - 1];
  const years = [...new Set(all.map((r) => r.date.slice(0, 4)))];

  const cats = CATS.map(([k]) => {
    const rs = rounds.filter((r) => r.cat === k);
    const gaps = rs.slice(1).map((r, i) => ({ d: daysBetween(rs[i].date, r.date), from: rs[i].date, to: r.date }));
    const longest = gaps.reduce((a, b) => (b.d > a.d ? b : a), { d: 0 });
    const cut = rs.map((r) => r.crs);
    return {
      k, rs, n: rs.length, itas: sum(rs), lo: Math.min(...cut), hi: Math.max(...cut),
      first: rs[0], latest: rs[rs.length - 1], longest, medGap: gaps.length >= 2 ? median(gaps.map((g) => g.d)) : null,
      since: daysBetween(rs[rs.length - 1].date, AS_OF),
      perYear: years.map((y) => rs.filter((r) => r.date.startsWith(y)).length),
    };
  }).filter((c) => c.n).sort((a, b) => b.itas - a.itas);
  const c = (k) => cats.find((x) => x.k === k);
  const fr = c('french'), hc = c('healthcare'), tr = c('trades'), tp = c('transport'), ph = c('physicians'), mil = c('military');
  const stem = c('stem'), agri = c('agriculture'), edu = c('education'), mgr = c('managers');

  // Claims the prose makes. If one stops holding, the build stops.
  check(first.cat === 'healthcare', 'the first category round was a healthcare round');
  check(cats.length === CATS.length, 'every category in the list has had at least one round');
  check(cats[0].k === 'french' && fr.itas / total > 0.5, 'French rounds issued more than half of all category invitations');
  const everyYear = cats.filter((x) => x.perYear.every((n) => n > 0)).map((x) => x.k).sort();
  check(everyYear.join() === 'french,healthcare,trades', 'French, healthcare and trades are the only categories with a round in every year');
  check(stem.latest.date < '2024-05-01' && agri.latest.date < '2024-05-01', 'STEM and agriculture have had no round since early 2024');
  check(edu.perYear.every((n, i) => (years[i] === '2025' ? n === edu.n : n === 0)), 'education rounds were held only in 2025');
  check(['physicians', 'managers', 'military'].every((k) => c(k).first.date.startsWith('2026')), 'physicians, senior managers and military recruits first had rounds in 2026');
  check(tp.longest.d > 365 * 2, 'transport went more than two years without a round');
  check(ph.hi < Math.min(...cats.filter((x) => x.k !== 'physicians').map((x) => x.lo)), 'physician cutoffs were the lowest of any category');
  check(mil.n === 1 && mil.itas < 10, 'the only military round invited fewer than ten people');
  // Healthcare: the two highest cutoffs came in the smallest rounds.
  const hcSmall = Math.min(...hc.rs.map((r) => r.size));
  const hcTop2 = [...hc.rs].sort((a, b) => b.crs - a.crs).slice(0, 2);
  check(hcTop2.every((r) => r.size === hcSmall), 'the two highest healthcare cutoffs came in the smallest healthcare rounds');
  // French in 2026: steady, large rounds.
  const fr26 = fr.rs.filter((r) => r.date.startsWith('2026'));
  const fr26lo = Math.min(...fr26.map((r) => r.size)), fr26hi = Math.max(...fr26.map((r) => r.size));
  const fr26cutLo = Math.min(...fr26.map((r) => r.crs)), fr26cutHi = Math.max(...fr26.map((r) => r.crs));
  check(fr26lo >= 4000, 'every 2026 French round invited at least 4,000');

  // Share of all invitations, year by year.
  const share = years.map((y) => {
    const a = all.filter((r) => r.date.startsWith(y)), cr = rounds.filter((r) => r.date.startsWith(y));
    return { y, n: cr.length, itas: sum(cr), allN: a.length, allItas: sum(a), s: sum(cr) / sum(a) };
  });
  const sh = (y) => share.find((x) => x.y === y);
  check(all.filter((r) => r.date.startsWith('2026') && !catOf(r)).every((r) => /canadian experience|provincial nominee/i.test(r.name)), 'the rest of 2026 went to CEC and PNP rounds');
  check(Math.abs(sh('2023').s - sh('2024').s) < 0.03 && sh('2025').s > sh('2024').s + 0.1 && sh('2026').s > 0.5, 'the category share was about the same in 2023 and 2024, then rose above half in 2025 and 2026');

  const cutLo = Math.min(...cats.map((x) => x.lo)), cutHi = Math.max(...cats.map((x) => x.hi));
  const range = (x) => (x.lo === x.hi ? String(x.lo) : `${x.lo}–${x.hi}`);
  const yearHead = (y) => (y === '2023' ? L('2023 (from June)', '2023 (dès juin)') : y === AS_OF.slice(0, 4) ? L(`${y} (to Nov. 25)`, `${y} (au 25 nov.)`) : y);
  const summaryTable = table(
    [L('Category', 'Catégorie'), L('Rounds', 'Rondes'), L('Invitations', 'Invitations'), L('Share', 'Part'), L('Cutoff range', 'Scores minimaux'), L('Latest round', 'Dernière ronde')],
    cats.map((x) => [catName(x.k), String(x.n), fmt(x.itas), pct(x.itas / total), range(x), longDate(x.latest.date)]),
  );
  const yearTable = table(
    [L('Category', 'Catégorie'), ...years.map(yearHead)],
    cats.map((x) => [catName(x.k), ...x.perYear.map((n) => (n ? String(n) : '–'))]),
  );
  const gapTable = table(
    [L('Category', 'Catégorie'), L('Longest gap', 'Plus long écart'), L('Between', 'Entre'), L('Median gap', 'Écart médian'), L('Days since latest round', 'Jours depuis la dernière ronde')],
    cats.filter((x) => x.n >= 2).sort((a, b) => b.longest.d - a.longest.d)
      .map((x) => [catName(x.k), L(`${fmt(x.longest.d)} days`, `${fmt(x.longest.d)} jours`), L(`${longDate(x.longest.from)} and ${longDate(x.longest.to)}`, `${longDate(x.longest.from)} et ${longDate(x.longest.to)}`), x.medGap === null ? '–' : L(`${x.medGap} days`, `${x.medGap} jours`), fmt(x.since)]),
  );
  const shareTable = table(
    [L('Year', 'Année'), L('Category rounds / all rounds', 'Rondes par catégorie / toutes'), L('Category invitations', 'Invitations par catégorie'), L('All invitations', 'Toutes les invitations'), L('Category share', 'Part des catégories')],
    share.map((x) => [yearHead(x.y), `${x.n} / ${x.allN}`, fmt(x.itas), fmt(x.allItas), pct(x.s)]),
  );

  const faq = [
    [L('How many category-based Express Entry rounds have there been?', 'Combien de rondes par catégorie d’Entrée express y a-t-il eu ?'),
      L(`${rounds.length} from ${longDate(first.date)} to ${longDate(last.date)}, with ${fmt(total)} invitations to apply in total. French-language proficiency rounds account for ${fr.n} of them and ${pct(fr.itas / total)} of the invitations.`,
        `${rounds.length}, du ${longDate(first.date)} au ${longDate(last.date)}, pour ${fmt(total)} invitations à présenter une demande au total. Les rondes de compétence linguistique en français en représentent ${fr.n} et ${pct(fr.itas / total)} des invitations.`)],
    [L('How often are healthcare category rounds held?', 'À quelle fréquence ont lieu les rondes pour les soins de santé ?'),
      L(`There have been ${hc.n} healthcare and social services rounds since June 2023, with a median gap of ${hc.medGap} days between them. The longest wait was ${hc.longest.d} days, from ${longDate(hc.longest.from)} to ${longDate(hc.longest.to)}. IRCC publishes no schedule.`,
        `Il y a eu ${hc.n} rondes pour les soins de santé et services sociaux depuis juin 2023, avec un écart médian de ${hc.medGap} jours. La plus longue attente a été de ${hc.longest.d} jours, du ${longDate(hc.longest.from)} au ${longDate(hc.longest.to)}. IRCC ne publie aucun calendrier.`)],
    [L('Is there still a STEM category?', 'Y a-t-il encore une catégorie STIM ?'),
      L(`The round data cannot answer that. The last STEM round was on ${longDate(stem.latest.date)}, and none has been held since. Check IRCC's category-based selection page for the categories currently in use.`,
        `Les données des rondes ne permettent pas de répondre. La dernière ronde STIM a eu lieu le ${longDate(stem.latest.date)}, et aucune n’a suivi depuis. Consultez la page d’IRCC sur la sélection par catégorie pour les catégories en vigueur.`)],
    [L('Why are physician cutoffs so low?', 'Pourquoi les scores minimaux des médecins sont-ils si bas ?'),
      L(`Each category round ranks only the candidates who qualify for it. The ${ph.n} physician rounds invited ${fmt(ph.itas)} people in total, with cutoffs of ${ph.lo} to ${ph.hi}. A cutoff that low does not help a candidate who is outside the category.`,
        `Chaque ronde par catégorie ne classe que les candidats admissibles à celle-ci. Les ${ph.n} rondes pour les médecins ont invité ${fmt(ph.itas)} personnes au total, avec des scores minimaux de ${ph.lo} à ${ph.hi}. Un score minimal aussi bas n’aide pas un candidat hors de la catégorie.`)],
  ];
  const faqMd = faq.map(([q, a]) => `### ${q}\n\n${a}`).join('\n\n');

  const md = L(`# Express Entry category rounds: who they invite and how often

Category-based rounds invite only candidates who fit a category IRCC has chosen, such as French ability or work in an occupation like healthcare or the trades. This article counts every one of them: ${rounds.length} rounds from the first, on ${longDate(first.date)}, to ${longDate(last.date)}, with **${fmt(total)} invitations to apply**. You will see how often each category has run, the cutoff range in each, the longest waits between rounds, and how much of Express Entry now goes through categories. All figures come from IRCC's published round results, counted up to ${longDate(AS_OF)}.

For the basics of each round type, see [Express Entry draw types](/express-entry-draws). For the year so far across all round types, see [Express Entry in 2026](/express-entry-2026-review).

## Who category rounds are for

A category round ranks only the profiles that meet that category's criteria, by CRS score, and invites the top of that list. Your score is the same as in any other round; what changes is who you compete with. That is why the cutoffs below range from ${cutLo} to ${cutHi}.

IRCC sets the eligibility rules and the occupations each category covers, and it revises them: the round names carry a version, and healthcare rounds were called "healthcare occupations" in 2023 and 2024 and "healthcare and social services occupations" from 2025. This article groups each category's versions together. **Before you count on a category, read the current rules and occupation lists on IRCC's [category-based selection page](${IRCC_CATEGORIES}).** Two of the 2026 categories, physicians and senior managers, include "with Canadian work experience" in the round name itself.

## Every category since 2023

${summaryTable}

French-language proficiency stands apart. Its ${fr.n} rounds issued ${fmt(fr.itas)} invitations, ${pct(fr.itas / total)} of everything sent through categories. In 2026 every French round invited ${fmt(fr26lo)} to ${fmt(fr26hi)} candidates, with cutoffs of ${fr26cutLo} to ${fr26cutHi}.

Healthcare is the second-largest category, with ${fmt(hc.itas)} invitations in ${hc.n} rounds. Its two highest cutoffs, ${hcTop2[0].crs} and ${hcTop2[1].crs}, came in rounds of only ${fmt(hcSmall)} invitations, the smallest size it has used. Round size matters: a small round reaches less far down the ranking.

The smallest categories are very small. The one skilled military recruits round invited ${mil.itas} people, and the ${ph.n} physician rounds ${fmt(ph.itas)} between them.

## How often each category has run

${yearTable}

Only French, healthcare and trades have had a round in every year from 2023 to 2026. STEM's last round was on ${longDate(stem.latest.date)} and agriculture's on ${longDate(agri.latest.date)}; neither has run since. Education rounds were held only in 2025 (${edu.n} of them). Physicians, senior managers and skilled military recruits appeared for the first time in 2026. The round data shows when a category ran, not whether it is still on IRCC's list, so check IRCC's page for that.

## The longest waits

${gapTable}

Long gaps are normal, even in the busiest categories. French went ${fr.longest.d} days without a round in 2025, between ${longDate(fr.longest.from)} and ${longDate(fr.longest.to)}. Trades waited ${tr.longest.d} days. Transport went ${fmt(tp.longest.d)} days, more than two years, before its rounds came back in ${monthYear(tp.longest.to)}. The median gap is a fairer guide to the usual rhythm than the average, because one long pause would pull an average up. Senior managers' median (${mgr.medGap} days) and physicians' (${ph.medGap} days) rest on only ${mgr.n === ph.n ? `${mgr.n} rounds each` : `${mgr.n} and ${ph.n} rounds`}, which is too few to call a pattern.

## A larger share of invitations

${shareTable}

Categories issued ${pct(sh('2023').s)} of invitations from June to December 2023 and about the same in 2024 (${pct(sh('2024').s)}). The share then rose to ${pct(sh('2025').s)} in 2025. In 2026 it is ${pct(sh('2026').s)}, with ${sh('2026').n} of the year's ${sh('2026').allN} rounds. The rest went to Canadian Experience Class and Provincial Nominee Program rounds.

## What this means for you

- **Check whether you qualify for a category first.** If you do, the cutoff that matters to you may be far below the CEC one. Read IRCC's rules for the category, then compare your score with recent rounds of that category on the [draws page](/draws) or with the [CRS calculator](/crs-calculator).
- **French has been the most regular category.** It has run every year and made up ${pct(fr.itas / total)} of category invitations. The [language test guide](/language-tests-clb) explains the French tests and NCLC levels.
- **Do not plan around a schedule.** Gaps of four months or more have happened in every category with more than three rounds. A category can also go quiet for years, as STEM and agriculture have.
- **A low cutoff is only low for those inside the category.** If you do not qualify, the guide to [improving your CRS score](/improve-crs-score) covers the other options.
- **Cutoffs change scale after November 3, 2026.** The CRS points changed and the pool was rescored, so cutoffs from rounds held after that date are not directly comparable with the ones above. See [what changed in 2026](/express-entry-changes-2026).

## Common questions

${faqMd}

## Sources

- IRCC, [Express Entry rounds of invitations](${IRCC_ROUNDS}), results up to round #${all[all.length - 1].number} (${longDate(all[all.length - 1].date)})
- IRCC, [Category-based selection](${IRCC_CATEGORIES}), for eligibility and the occupations each category covers
- Every round counted here has its own page in the [draw history](/draws), and [draw analytics](/analytics) charts cutoffs over time.
`, `# Rondes par catégorie d’Entrée express : qui elles invitent et à quel rythme

Les rondes par catégorie n’invitent que les candidats qui correspondent à une catégorie choisie par IRCC, comme la maîtrise du français ou le travail dans une profession comme la santé ou les métiers. Cet article les compte toutes : ${rounds.length} rondes, de la première, le ${longDate(first.date)}, jusqu’au ${longDate(last.date)}, pour **${fmt(total)} invitations à présenter une demande**. Vous verrez à quelle fréquence chaque catégorie a eu lieu, ses scores minimaux, les plus longues attentes entre deux rondes et la part d’Entrée express qui passe maintenant par les catégories. Tous les chiffres viennent des résultats publiés par IRCC, comptés jusqu’au ${longDate(AS_OF)}.

Pour les notions de base sur chaque type de ronde, voir [les types de tirages Entrée express](/express-entry-draws). Pour l’année en cours, tous types confondus, voir [Entrée express en 2026](/express-entry-2026-review).

## À qui s’adressent les rondes par catégorie

Une ronde par catégorie ne classe que les profils qui respectent les critères de la catégorie, selon le score CRS, et invite le haut de cette liste. Votre score est le même que dans toute autre ronde ; ce qui change, ce sont les candidats contre qui vous êtes classé. C’est pourquoi les scores minimaux ci-dessous vont de ${cutLo} à ${cutHi}.

IRCC fixe les critères d’admissibilité et les professions de chaque catégorie, et les révise : le nom des rondes porte un numéro de version, et les rondes en santé s’appelaient « professions de la santé » en 2023 et 2024, puis « professions des soins de santé et des services sociaux » à partir de 2025. Cet article regroupe les versions de chaque catégorie. **Avant de compter sur une catégorie, lisez les règles et les listes de professions en vigueur sur la [page d’IRCC sur la sélection par catégorie](${IRCC_CATEGORIES}) (en anglais).** Deux catégories de 2026, les médecins et les cadres supérieurs, précisent « avec expérience de travail au Canada » dans le nom même de la ronde.

## Chaque catégorie depuis 2023

${summaryTable}

La compétence linguistique en français se démarque. Ses ${fr.n} rondes ont envoyé ${fmt(fr.itas)} invitations, soit ${pct(fr.itas / total)} de tout ce qui est passé par les catégories. En 2026, chaque ronde en français a invité de ${fmt(fr26lo)} à ${fmt(fr26hi)} candidats, avec des scores minimaux de ${fr26cutLo} à ${fr26cutHi}.

La santé est la deuxième catégorie en importance, avec ${fmt(hc.itas)} invitations en ${hc.n} rondes. Ses deux scores minimaux les plus élevés, ${hcTop2[0].crs} et ${hcTop2[1].crs}, sont venus de rondes de seulement ${fmt(hcSmall)} invitations, la plus petite taille utilisée. La taille compte : une petite ronde descend moins loin dans le classement.

Les plus petites catégories sont vraiment petites. L’unique ronde pour les recrues militaires qualifiées a invité ${mil.itas} personnes, et les ${ph.n} rondes pour les médecins, ${fmt(ph.itas)} en tout.

## À quelle fréquence chaque catégorie a eu lieu

${yearTable}

Seules les catégories du français, de la santé et des métiers ont eu une ronde chaque année de 2023 à 2026. La dernière ronde STIM date du ${longDate(stem.latest.date)} et celle de l’agriculture du ${longDate(agri.latest.date)} ; aucune des deux n’a eu lieu depuis. Les rondes en éducation n’ont eu lieu qu’en 2025 (${edu.n} rondes). Les médecins, les cadres supérieurs et les recrues militaires qualifiées sont apparus pour la première fois en 2026. Les données des rondes montrent quand une catégorie a eu lieu, pas si elle figure encore sur la liste d’IRCC : vérifiez-le sur la page d’IRCC.

## Les plus longues attentes

${gapTable}

Les longs écarts sont normaux, même dans les catégories les plus actives. Le français est resté ${fr.longest.d} jours sans ronde en 2025, entre le ${longDate(fr.longest.from)} et le ${longDate(fr.longest.to)}. Les métiers ont attendu ${tr.longest.d} jours. Le transport a attendu ${fmt(tp.longest.d)} jours, plus de deux ans, avant le retour de ses rondes en ${monthYear(tp.longest.to)}. L’écart médian donne une meilleure idée du rythme habituel que la moyenne, parce qu’une seule longue pause gonflerait la moyenne. L’écart médian des cadres supérieurs (${mgr.medGap} jours) et celui des médecins (${ph.medGap} jours) ne reposent que sur ${mgr.n === ph.n ? `${mgr.n} rondes chacun` : `${mgr.n} et ${ph.n} rondes`}, ce qui est trop peu pour parler de tendance.

## Une plus grande part des invitations

${shareTable}

Les catégories ont envoyé ${pct(sh('2023').s)} des invitations de juin à décembre 2023, et à peu près autant en 2024 (${pct(sh('2024').s)}). Leur part est ensuite montée à ${pct(sh('2025').s)} en 2025. En 2026, elle est de ${pct(sh('2026').s)}, avec ${sh('2026').n} des ${sh('2026').allN} rondes de l’année. Le reste est allé aux rondes de la Catégorie de l’expérience canadienne et du Programme des candidats des provinces.

## Ce que cela veut dire pour vous

- **Vérifiez d’abord si vous êtes admissible à une catégorie.** Si oui, le score minimal qui compte pour vous peut être bien plus bas que celui de la CEC. Lisez les règles d’IRCC pour la catégorie, puis comparez votre score aux rondes récentes de cette catégorie sur la [page des tirages](/draws) ou avec le [calculateur CRS](/crs-calculator).
- **Le français a été la catégorie la plus régulière.** Cette catégorie a eu des rondes chaque année et représente ${pct(fr.itas / total)} des invitations par catégorie. Le [guide des tests de langue](/language-tests-clb) présente les tests de français et les niveaux NCLC.
- **Ne planifiez pas selon un calendrier.** Des écarts de quatre mois ou plus sont survenus dans chaque catégorie ayant eu plus de trois rondes. Une catégorie peut aussi rester inactive pendant des années, comme les STIM et l’agriculture.
- **Un score minimal bas ne l’est que pour les candidats de la catégorie.** Si vous n’êtes pas admissible, le guide pour [améliorer votre score CRS](/improve-crs-score) présente les autres options.
- **Les scores minimaux changent d’échelle après le 3 novembre 2026.** Les points du CRS ont changé et le bassin a été recalculé : les scores des rondes tenues après cette date ne se comparent pas directement à ceux ci-dessus. Voir [ce qui a changé en 2026](/express-entry-changes-2026).

## Questions fréquentes

${faqMd}

## Sources

- IRCC, [Rondes d’invitations d’Entrée express](${IRCC_ROUNDS}) (en anglais), résultats jusqu’à la ronde n° ${all[all.length - 1].number} (${longDate(all[all.length - 1].date)})
- IRCC, [Sélection par catégorie](${IRCC_CATEGORIES}) (en anglais), pour l’admissibilité et les professions de chaque catégorie
- Chaque ronde comptée ici a sa propre page dans l’[historique des tirages](/draws), et l’[analyse des tirages](/analytics) montre l’évolution des scores minimaux.
`);

  // "Gaps of four months or more in every category with more than three rounds."
  check(cats.filter((x) => x.n > 3).every((x) => x.longest.d >= 120), 'every category with more than three rounds has had a gap of four months or more');

  return {
    file: 'express-entry-category-rounds', path: '/express-entry-category-rounds', priority: '0.8', reviewed: REVIEWED,
    title: L('Express Entry Category Rounds: Who They Invite and How Often', 'Rondes par catégorie d’Entrée express : qui et à quel rythme'),
    label: L('Express Entry Category Rounds', 'Rondes par catégorie'),
    faq,
    description: L(`All ${rounds.length} Express Entry category rounds since 2023: invitations, cutoff ranges, rounds per year and the longest gaps for each category.`,
      `Les ${rounds.length} rondes par catégorie d’Entrée express depuis 2023 : invitations, scores minimaux, rondes par année et plus longs écarts.`),
    llm: `Every Express Entry category-based round from June 2023 to ${AS_OF} (${rounds.length} rounds): invitations, cutoff ranges, rounds per year, longest and median gaps by category, and the category share of all invitations by year.`,
    short: L('How often each category has run, and for whom', 'Le rythme de chaque catégorie, et pour qui'),
    related: ['express-entry-draws', 'express-entry-2026-review', 'improve-crs-score'],
    md,
  };
}
