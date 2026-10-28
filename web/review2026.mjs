import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LANG, LOCALE } from './i18n.mjs';

// "Express Entry in 2026 so far": an analysis of the year's rounds, written as a dated
// article. The prose describes patterns (no all-program rounds, French as the biggest
// source of invitations, the PNP-then-CEC rhythm), so the data is frozen at AS_OF:
// later rounds must not quietly falsify the text. Every number is still computed from
// data/ee-rounds-all.json, and the build fails if a claim the prose makes stops holding.
// To refresh it, move AS_OF, re-read the prose against the new numbers, and bump REVIEWED.
export const AS_OF = '2026-10-27';
const REVIEWED = '2026-10-28';

const here = dirname(fileURLToPath(import.meta.url));
const L = (en, fr) => (LANG === 'fr' ? fr : en);
const fmt = (n) => Number(n).toLocaleString(LOCALE);
const pct = (n) => (n > 0 && n < 0.005 ? L('<1%', '<1 %') : `${Math.round(n * 100)}${L('%', ' %')}`);
const day = (d) => new Date(`${d}T12:00:00Z`);
const longDate = (d) => day(d).toLocaleDateString(L('en-CA', 'fr-CA'), { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).replace(/^1 /, L('1 ', '1er '));
const shortDate = (d) => day(d).toLocaleDateString(L('en-CA', 'fr-CA'), { day: 'numeric', month: 'short', timeZone: 'UTC' });
const monthName = (m) => day(`${m}-15`).toLocaleDateString(L('en-CA', 'fr-CA'), { month: 'long', timeZone: 'UTC' });
const daysBetween = (a, b) => Math.round((day(b) - day(a)) / 86400000);
const table = (head, rows) =>
  [`| ${head.join(' | ')} |`, `| ${head.map(() => '---').join(' | ')} |`, ...rows.map((r) => `| ${r.join(' | ')} |`)].join('\n');
const check = (ok, what) => { if (!ok) throw new Error(`review2026.mjs: the article says "${what}", which the data no longer supports`); };

// IRCC's labels change between years ("French language proficiency (Version 1)" in 2025,
// "French-Language proficiency" in 2026), so group rounds by type.
const TYPES = [
  ['cec', /canadian experience/i, 'Canadian Experience Class', 'Catégorie de l’expérience canadienne'],
  ['pnp', /provincial nominee/i, 'Provincial Nominee Program', 'Programme des candidats des provinces'],
  ['french', /french/i, 'French-language proficiency', 'Compétence linguistique en français'],
  ['physicians', /physician/i, 'Physicians', 'Médecins'],
  ['healthcare', /health/i, 'Healthcare and social services', 'Soins de santé et services sociaux'],
  ['trades', /trade/i, 'Trades', 'Métiers'],
  ['managers', /senior manager/i, 'Senior managers', 'Cadres supérieurs'],
  ['transport', /transport/i, 'Transport', 'Transport'],
  ['education', /education/i, 'Education', 'Éducation'],
  ['military', /military/i, 'Skilled military recruits', 'Recrues militaires qualifiées'],
  ['stem', /stem|science/i, 'STEM', 'STIM'],
  ['general', /no program|general|all program/i, 'All programs (general)', 'Tous les programmes (générale)'],
];
const typeOf = (r) => (TYPES.find(([, re]) => re.test(r.label || r.name)) ?? ['other'])[0];
const typeName = (k) => { const t = TYPES.find(([key]) => key === k); return t ? L(t[2], t[3]) : k; };

export function buildReview2026({ IRCC_ROUNDS }) {
  const all = JSON.parse(readFileSync(resolve(here, '../data/ee-rounds-all.json'), 'utf8')).rounds
    .map((r) => ({ ...r, type: typeOf(r) }));
  const rounds = all.filter((r) => r.date >= '2026-01-01' && r.date <= AS_OF).reverse(); // oldest first
  const prev = all.filter((r) => r.date.startsWith('2025'));
  const sum = (a) => a.reduce((n, r) => n + r.size, 0);
  const avg = (a) => Math.round(a.reduce((n, r) => n + r.crs, 0) / a.length);
  const total = sum(rounds);
  const first = rounds[0], last = rounds[rounds.length - 1];

  const byType = new Map();
  for (const r of rounds) byType.set(r.type, [...(byType.get(r.type) ?? []), r]);
  const types = [...byType.entries()].map(([k, rs]) => ({ k, rs, n: rs.length, itas: sum(rs), lo: Math.min(...rs.map((r) => r.crs)), hi: Math.max(...rs.map((r) => r.crs)), avg: avg(rs), latest: rs[rs.length - 1] }))
    .sort((a, b) => b.itas - a.itas);
  const t = (k) => types.find((x) => x.k === k);
  const cec = t('cec'), pnp = t('pnp'), fr = t('french');

  // Claims the prose makes. If one stops holding, the build stops.
  check(!byType.has('general'), 'there has been no all-program round this year');
  check(types[0].k === 'french' && types[1].k === 'cec', 'French rounds issued the most invitations, ahead of CEC');
  check(pnp.n === Math.max(...types.map((x) => x.n)), 'PNP rounds were the most frequent');

  // The CEC story: big rounds early in the year, then smaller ones with higher cutoffs.
  const cecEarly = cec.rs.filter((r) => r.date < '2026-04-01');
  const cecLate = cec.rs.filter((r) => r.date >= '2026-04-01');
  const range = (a, f) => { const v = a.map(f); return [Math.min(...v), Math.max(...v)]; };
  const [ceSizeLo, ceSizeHi] = range(cecEarly, (r) => r.size);
  const [clSizeLo, clSizeHi] = range(cecLate, (r) => r.size);
  const [ceCutLo, ceCutHi] = range(cecEarly, (r) => r.crs);
  const [clCutLo, clCutHi] = range(cecLate, (r) => r.crs);
  check(clSizeHi < ceSizeHi && clCutLo > ceCutLo, 'CEC rounds got smaller and their cutoffs rose after March');

  // The two-week rhythm: a PNP round, then a CEC round a day or two later.
  const pnpGaps = pnp.rs.slice(1).map((r, i) => daysBetween(pnp.rs[i].date, r.date));
  const fortnightly = pnpGaps.filter((g) => g >= 13 && g <= 15).length;
  const pnpMondays = pnp.rs.filter((r) => day(r.date).getUTCDay() === 1).length;
  const paired = pnp.rs.filter((p) => cec.rs.some((c) => { const g = daysBetween(p.date, c.date); return g >= 0 && g <= 2; })).length;
  const sameWeek = pnp.rs.filter((p) => rounds.some((r) => !['pnp', 'cec'].includes(r.type) && daysBetween(p.date, r.date) > 0 && daysBetween(p.date, r.date) <= 4)).length;
  check(fortnightly / pnpGaps.length >= 0.8 && paired / pnp.n >= 0.75 && sameWeek / pnp.n >= 0.6, 'PNP rounds came every two weeks, usually followed by CEC and then a French or category round');

  // Month by month.
  const months = [...new Set(rounds.map((r) => r.date.slice(0, 7)))];
  const monthRows = months.map((m) => { const rs = rounds.filter((r) => r.date.startsWith(m)); return [`${monthName(m)[0].toUpperCase()}${monthName(m).slice(1)}`, String(rs.length), fmt(sum(rs)), [...new Set(rs.map((r) => r.type))].map(typeName).join(', ')]; });
  const busiest = months.map((m) => [m, sum(rounds.filter((r) => r.date.startsWith(m)))]).sort((a, b) => b[1] - a[1])[0];
  const quietest = months.map((m) => [m, sum(rounds.filter((r) => r.date.startsWith(m)))]).sort((a, b) => a[1] - b[1])[0];

  // Against 2025 (the full year).
  const cmp = ['cec', 'french', 'healthcare', 'pnp'].map((k) => {
    const a = prev.filter((r) => r.type === k), b = byType.get(k) ?? [];
    return a.length && b.length ? { k, n25: a.length, avg25: avg(a), n26: b.length, avg26: avg(b) } : null;
  }).filter(Boolean);
  const c = (k) => cmp.find((x) => x.k === k);
  check(c('cec').avg26 < c('cec').avg25 && c('french').avg26 < c('french').avg25, 'CEC and French cutoffs averaged lower than in 2025');

  const lowest = rounds.reduce((a, b) => (b.crs < a.crs ? b : a));
  const others = types.filter((x) => !['cec', 'pnp', 'french'].includes(x.k));
  const othersItas = sum(others.flatMap((x) => x.rs));
  const typeTable = table(
    [L('Round type', 'Type de ronde'), L('Rounds', 'Rondes'), L('Invitations', 'Invitations'), L('Share', 'Part'), L('Cutoff range', 'Scores minimaux'), L('Average', 'Moyenne')],
    types.map((x) => [typeName(x.k), String(x.n), fmt(x.itas), pct(x.itas / total), x.lo === x.hi ? String(x.lo) : `${x.lo}–${x.hi}`, String(x.avg)]),
  );
  const cmpTable = table(
    [L('Round type', 'Type de ronde'), L('2025 rounds', 'Rondes 2025'), L('2025 average cutoff', 'Moyenne 2025'), L('2026 rounds', 'Rondes 2026'), L('2026 average cutoff', 'Moyenne 2026')],
    cmp.map((x) => [typeName(x.k), String(x.n25), String(x.avg25), String(x.n26), String(x.avg26)]),
  );
  const monthTable = table([L('Month', 'Mois'), L('Rounds', 'Rondes'), L('Invitations', 'Invitations'), L('Round types', 'Types de rondes')], monthRows);

  const faq = [
    [L('How many Express Entry draws have there been in 2026?', 'Combien de rondes Entrée express y a-t-il eu en 2026 ?'),
      L(`${rounds.length} rounds from ${longDate(first.date)} to ${longDate(last.date)}, with ${fmt(total)} invitations to apply in total.`,
        `${rounds.length} rondes du ${longDate(first.date)} au ${longDate(last.date)}, pour ${fmt(total)} invitations à présenter une demande au total.`)],
    [L('Has IRCC held any all-program draws in 2026?', 'IRCC a-t-il tenu des rondes pour tous les programmes en 2026 ?'),
      L(`No. Up to ${longDate(AS_OF)}, every 2026 round was limited to one program (CEC or PNP) or one category, such as French-language proficiency or healthcare.`,
        `Non. Jusqu’au ${longDate(AS_OF)}, chaque ronde de 2026 était réservée à un programme (CEC ou PCP) ou à une catégorie, comme la compétence en français ou la santé.`)],
    [L('What CRS score has been enough for a CEC invitation in 2026?', 'Quel score CRS a suffi pour une invitation CEC en 2026 ?'),
      L(`CEC cutoffs ranged from ${cec.lo} to ${cec.hi} across ${cec.n} rounds, and from ${clCutLo} to ${clCutHi} since April. A score at the cutoff is only invited if the profile was created before the round's tie-break time.`,
        `Les scores minimaux CEC allaient de ${cec.lo} à ${cec.hi} sur ${cec.n} rondes, et de ${clCutLo} à ${clCutHi} depuis avril. Un score égal au minimum n’est invité que si le profil a été créé avant l’heure de départage de la ronde.`)],
    [L('Will these patterns continue?', 'Ces tendances vont-elles continuer ?'),
      L('Not necessarily. IRCC sets each round on its own, and the CRS changes on November 3, 2026, when the whole pool is rescored and rounds pause for up to two weeks. Treat past cutoffs as context, not a forecast.',
        'Pas forcément. IRCC fixe chaque ronde séparément, et le CRS change le 3 novembre 2026 : tout le bassin sera recalculé et les rondes seront suspendues jusqu’à deux semaines. Les scores passés donnent un contexte, pas une prévision.')],
  ];
  const faqMd = faq.map(([q, a]) => `### ${q}\n\n${a}`).join('\n\n');

  const md = L(`# Express Entry in 2026 so far: what ${rounds.length} rounds show

From ${longDate(first.date)} to ${longDate(last.date)}, IRCC held **${rounds.length} Express Entry rounds** and issued **${fmt(total)} invitations to apply**. This article looks at where those invitations went, how cutoffs moved, and the rhythm the rounds followed. All figures come from IRCC's published round results, counted up to ${longDate(AS_OF)}.

## Five things the 2026 rounds show

1. **There has not been a single all-program round.** Every round this year was limited to one program or one category. Candidates who qualify only through the Federal Skilled Worker program, with no Canadian experience, French or category occupation, have had no round of their own.
2. **French speakers received the most invitations.** French-language proficiency rounds issued ${fmt(fr.itas)} invitations (${pct(fr.itas / total)} of the year) in ${fr.n} rounds, slightly more than the Canadian Experience Class's ${fmt(cec.itas)} in ${cec.n} rounds. French cutoffs ranged from ${fr.lo} to ${fr.hi}, far below CEC.
3. **CEC rounds got smaller, and the bar rose.** Before April, CEC rounds invited ${fmt(ceSizeLo)} to ${fmt(ceSizeHi)} candidates with cutoffs of ${ceCutLo} to ${ceCutHi}. From April they invited ${fmt(clSizeLo)} to ${fmt(clSizeHi)}, with cutoffs of ${clCutLo} to ${clCutHi}.
4. **PNP rounds were the most frequent but the smallest.** ${pnp.n} rounds invited ${fmt(pnp.itas)} candidates in total. Their cutoffs (${pnp.lo} to ${pnp.hi}) include the 600 points a provincial nomination adds, so without it they correspond to roughly ${pnp.lo - 600} to ${pnp.hi - 600}.
5. **Category rounds were occasional but generous.** Healthcare, trades, senior managers, physicians and the other categories together invited ${fmt(othersItas)} candidates. The lowest cutoff of the year was ${lowest.crs}, in a ${typeName(lowest.type).toLowerCase()} round on ${longDate(lowest.date)}.

## Invitations by round type

${typeTable}

## The two-week rhythm

The year settled into a regular pattern. A PNP round came about every two weeks: ${fortnightly} of the ${pnpGaps.length} gaps between PNP rounds were 13 to 15 days, and ${pnpMondays} of the ${pnp.n} PNP rounds fell on a Monday. In ${paired} of those ${pnp.n} cycles, a CEC round followed within two days, and in ${sameWeek} a French or category round came within four days of the PNP round.

This rhythm is a habit, not a rule. IRCC does not publish a draw schedule and has broken the pattern before: there was a four-week gap between PNP rounds in May. If you are waiting on a round, the [latest draws](/draws) page and the app's alerts are a better guide than the calendar.

## Month by month

${monthTable}

${monthName(busiest[0])[0].toUpperCase()}${monthName(busiest[0]).slice(1)} was the busiest month, with ${fmt(busiest[1])} invitations, and ${monthName(quietest[0])} the quietest, with ${fmt(quietest[1])}.

## Compared with 2025

${cmpTable}

CEC and French cutoffs averaged lower in 2026 than across 2025. For CEC, that is mostly because the large rounds early in the year had low cutoffs; the smaller rounds since April have sat closer to the 2025 average. Keep in mind that 2025 is a full year and 2026 is not.

## What this means if you are in the pool

- **If you qualify for CEC**, recent cutoffs have stayed in a narrow band, ${clCutLo} to ${clCutHi} since April. The [CRS calculator](/crs-calculator) shows where you stand against the latest one.
- **If you speak French**, French rounds have been the largest source of invitations this year. NCLC 7 in all four abilities qualifies you for them and adds up to 50 CRS points. See the [language test guide](/language-tests-clb).
- **If you rely on the Federal Skilled Worker program alone**, you have had no round of your own in 2026. A provincial nomination, a category occupation or French is the realistic path, and the guide to [improving your CRS score](/improve-crs-score) prices each option.
- **Expect change after November 3, 2026.** The CRS adds points for high-wage work and job offers, and the whole pool is rescored. Cutoffs will be measured on a new scale. See [what is changing](/express-entry-changes-2026).

## Common questions

${faqMd}

## Sources

- IRCC, [Express Entry rounds of invitations](${IRCC_ROUNDS}), results up to round #${last.number} (${longDate(last.date)})
- Every round discussed here has its own page in the [draw history](/draws), and each [round type](/express-entry-draws) is explained in its own guide.
`, `# Entrée express en 2026 : ce que montrent ${rounds.length} rondes

Du ${longDate(first.date)} au ${longDate(last.date)}, IRCC a tenu **${rounds.length} rondes d’Entrée express** et envoyé **${fmt(total)} invitations à présenter une demande**. Cet article examine où sont allées ces invitations, comment les scores minimaux ont évolué et le rythme suivi par les rondes. Tous les chiffres viennent des résultats publiés par IRCC, comptés jusqu’au ${longDate(AS_OF)}.

## Cinq constats sur les rondes de 2026

1. **Il n’y a eu aucune ronde pour tous les programmes.** Chaque ronde de l’année était réservée à un programme ou à une catégorie. Les candidats admissibles seulement au Programme des travailleurs qualifiés (fédéral), sans expérience canadienne, sans français et sans profession visée par une catégorie, n’ont eu aucune ronde à eux.
2. **Les francophones ont reçu le plus d’invitations.** Les rondes de compétence en français ont envoyé ${fmt(fr.itas)} invitations (${pct(fr.itas / total)} de l’année) en ${fr.n} rondes, un peu plus que les ${fmt(cec.itas)} de la Catégorie de l’expérience canadienne en ${cec.n} rondes. Les scores minimaux en français allaient de ${fr.lo} à ${fr.hi}, bien en dessous de la CEC.
3. **Les rondes CEC ont rapetissé, et la barre a monté.** Avant avril, elles invitaient de ${fmt(ceSizeLo)} à ${fmt(ceSizeHi)} candidats avec des scores minimaux de ${ceCutLo} à ${ceCutHi}. Depuis avril, elles en invitent de ${fmt(clSizeLo)} à ${fmt(clSizeHi)}, avec des scores de ${clCutLo} à ${clCutHi}.
4. **Les rondes du PCP ont été les plus fréquentes, mais les plus petites.** ${pnp.n} rondes ont invité ${fmt(pnp.itas)} candidats au total. Leurs scores minimaux (${pnp.lo} à ${pnp.hi}) incluent les 600 points d’une nomination provinciale ; sans elle, ils correspondent à environ ${pnp.lo - 600} à ${pnp.hi - 600}.
5. **Les rondes par catégorie ont été rares, mais généreuses.** Santé, métiers, cadres supérieurs, médecins et les autres catégories ont invité ensemble ${fmt(othersItas)} candidats. Le score minimal le plus bas de l’année a été de ${lowest.crs}, dans une ronde « ${typeName(lowest.type)} » le ${longDate(lowest.date)}.

## Invitations par type de ronde

${typeTable}

## Le rythme de deux semaines

L’année a pris un rythme régulier. Une ronde du PCP revenait environ toutes les deux semaines : ${fortnightly} des ${pnpGaps.length} intervalles entre rondes du PCP faisaient de 13 à 15 jours, et ${pnpMondays} des ${pnp.n} rondes du PCP ont eu lieu un lundi. Dans ${paired} de ces ${pnp.n} cycles, une ronde CEC a suivi dans les deux jours, et dans ${sameWeek} une ronde en français ou par catégorie a eu lieu dans les quatre jours suivant la ronde du PCP.

Ce rythme est une habitude, pas une règle. IRCC ne publie pas de calendrier des rondes et a déjà rompu le rythme : il y a eu un écart de quatre semaines entre deux rondes du PCP en mai. Si vous attendez une ronde, la page des [derniers tirages](/draws) et les alertes de l’appli sont plus fiables que le calendrier.

## Mois par mois

${monthTable}

${monthName(busiest[0])[0].toUpperCase()}${monthName(busiest[0]).slice(1)} a été le mois le plus chargé, avec ${fmt(busiest[1])} invitations, et ${monthName(quietest[0])} le plus calme, avec ${fmt(quietest[1])}.

## Par rapport à 2025

${cmpTable}

Les scores minimaux CEC et en français ont été plus bas en moyenne en 2026 que sur l’ensemble de 2025. Pour la CEC, c’est surtout dû aux grandes rondes du début d’année, aux scores bas ; les rondes plus petites depuis avril se rapprochent de la moyenne de 2025. Rappelez-vous que 2025 est une année complète, et 2026 non.

## Ce que cela veut dire si vous êtes dans le bassin

- **Si vous êtes admissible à la CEC**, les scores minimaux récents sont restés dans une fourchette étroite, de ${clCutLo} à ${clCutHi} depuis avril. Le [calculateur CRS](/crs-calculator) montre où vous vous situez par rapport au dernier.
- **Si vous parlez français**, les rondes en français ont été la plus grande source d’invitations cette année. Le NCLC 7 dans les quatre compétences vous y rend admissible et ajoute jusqu’à 50 points CRS. Voir le [guide des tests de langue](/language-tests-clb).
- **Si vous comptez seulement sur le Programme des travailleurs qualifiés (fédéral)**, vous n’avez eu aucune ronde à vous en 2026. Une nomination provinciale, une profession visée par une catégorie ou le français sont les voies réalistes ; le guide pour [améliorer votre score CRS](/improve-crs-score) chiffre chaque option.
- **Attendez-vous à du changement après le 3 novembre 2026.** Le CRS ajoute des points pour le travail et les offres d’emploi bien rémunérés, et tout le bassin est recalculé. Les scores minimaux se mesureront sur une nouvelle échelle. Voir [ce qui change](/express-entry-changes-2026).

## Questions fréquentes

${faqMd}

## Sources

- IRCC, [Rondes d’invitations d’Entrée express](${IRCC_ROUNDS}) (en anglais), résultats jusqu’à la ronde n° ${last.number} (${longDate(last.date)})
- Chaque ronde citée ici a sa propre page dans l’[historique des tirages](/draws), et chaque [type de ronde](/express-entry-draws) est expliqué dans son propre guide.
`);

  return {
    file: 'express-entry-2026-review', path: '/express-entry-2026-review', priority: '0.8', reviewed: REVIEWED,
    title: L(`Express Entry in 2026 So Far: What ${rounds.length} Draws Show`, `Entrée express en 2026 : ce que montrent ${rounds.length} rondes`),
    label: L('Express Entry in 2026 So Far', 'Entrée express en 2026'),
    faq,
    description: L(`An analysis of all ${rounds.length} Express Entry rounds in 2026: no all-program draws, French ahead of CEC, smaller CEC rounds and the two-week PNP rhythm.`,
      `Analyse des ${rounds.length} rondes d’Entrée express de 2026 : aucune ronde générale, le français devant la CEC, des rondes CEC plus petites et le rythme du PCP.`),
    llm: `Analysis of the ${rounds.length} Express Entry rounds from January 1 to ${AS_OF}: invitations and cutoffs by round type, the PNP/CEC two-week cycle, month by month, and a comparison with 2025.`,
    short: L('Where the 2026 invitations went, and why', 'Où sont allées les invitations de 2026'),
    related: ['express-entry-draws', 'improve-crs-score', 'express-entry-changes-2026'],
    md,
  };
}

