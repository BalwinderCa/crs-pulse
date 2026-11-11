import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LANG, LOCALE } from './i18n.mjs';

// "Inside the Express Entry pool": where CRS scores sit and how that moved in 2026.
// IRCC publishes a snapshot of the pool (profiles by CRS band) with every round, and the
// mirror keeps it on each round in data/ee-rounds-all.json. The prose describes trends,
// so the data is frozen at AS_OF, and check() fails the build if a claim stops holding.
//
// The CRS changed on 2026-11-03 and IRCC rescored the whole pool, so a snapshot dated on
// or after CHANGE is on a different scale. Those snapshots go in their own table and are
// never compared with the earlier ones. Up to AS_OF there are none.
// To refresh: move AS_OF, re-read the prose against the new numbers, and bump REVIEWED.
export const AS_OF = '2026-10-28';
const REVIEWED = '2026-11-11';
const CHANGE = '2026-11-03';

const here = dirname(fileURLToPath(import.meta.url));
const L = (en, fr) => (LANG === 'fr' ? fr : en);
const fmt = (n) => Number(n).toLocaleString(LOCALE);
const pct1 = (n) => `${(n * 100).toLocaleString(LOCALE, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}${L('%', ' %')}`;
const pct = (n) => `${Math.round(n * 100)}${L('%', ' %')}`;
const day = (d) => new Date(`${d}T12:00:00Z`);
const longDate = (d) => day(d).toLocaleDateString(L('en-CA', 'fr-CA'), { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).replace(/^1 /, L('1 ', '1er '));
const shortDate = (d) => day(d).toLocaleDateString(L('en-CA', 'fr-CA'), { day: 'numeric', month: 'short', timeZone: 'UTC' });
const cap = (s) => `${s[0].toUpperCase()}${s.slice(1)}`;
const monthName = (m) => cap(day(`${m}-15`).toLocaleDateString(L('en-CA', 'fr-CA'), { month: 'long', year: 'numeric', timeZone: 'UTC' }));
const daysBetween = (a, b) => Math.round((day(b) - day(a)) / 86400000);
const table = (head, rows) =>
  [`| ${head.join(' | ')} |`, `| ${head.map(() => '---').join(' | ')} |`, ...rows.map((r) => `| ${r.join(' | ')} |`)].join('\n');
const check = (ok, what) => { if (!ok) throw new Error(`eePool.mjs: the article says "${what}", which the data no longer supports`); };

// IRCC's poolAsOf is English text ("October 25, 2026"); turn it into an ISO date.
const isoOf = (s) => new Date(`${s} 12:00 UTC`).toISOString().slice(0, 10);
// The seven top-level bands the mirror keeps, as [label key, low, high].
const BANDS = [['601–1200', 601, 1200], ['501–600', 501, 600], ['451–500', 451, 500], ['401–450', 401, 450], ['351–400', 351, 400], ['301–350', 301, 350], ['0–300', 0, 300]];
const bandName = (lo, hi) => (LANG === 'fr' ? `${fmt(lo)} à ${fmt(hi)}` : `${fmt(lo)}–${fmt(hi)}`);

export function buildEePool({ IRCC_ROUNDS, IRCC_CHANGES }) {
  const all = JSON.parse(readFileSync(resolve(here, '../data/ee-rounds-all.json'), 'utf8')).rounds
    .filter((r) => r.date <= AS_OF);

  // One entry per published snapshot, oldest first. Several rounds can share a snapshot.
  const byDate = new Map();
  for (const r of all) {
    if (!r.poolAsOf || !r.pool?.length) continue;
    const date = isoOf(r.poolAsOf);
    if (byDate.has(date)) continue;
    const count = Object.fromEntries(r.pool.map((b) => [b.label, b.count]));
    check(BANDS.every(([k]) => Number.isFinite(count[k])), `the pool is published in seven bands (snapshot ${date})`);
    check(BANDS.reduce((n, [k]) => n + count[k], 0) === r.poolTotal, `the bands add up to the pool total (snapshot ${date})`);
    byDate.set(date, { date, count, total: r.poolTotal });
  }
  const snaps = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  const above = (s, floor) => BANDS.filter(([, lo]) => lo >= floor).reduce((n, [k]) => n + s.count[k], 0);
  const upTo = (s, ceil) => BANDS.filter(([, , hi]) => hi <= ceil).reduce((n, [k]) => n + s.count[k], 0);

  // Old scale and new scale, kept apart.
  const pre = snaps.filter((s) => s.date < CHANGE);
  const post = snaps.filter((s) => s.date >= CHANGE);
  const pre26 = pre.filter((s) => s.date >= '2026-01-01');
  const base = pre.filter((s) => s.date < '2026-01-01').at(-1); // the last 2025 snapshot
  const first = pre26[0], latest = pre.at(-1);

  // ------------------------------------------------ the latest distribution
  const distTable = table(
    [L('CRS band', 'Tranche CRS'), L('Profiles', 'Profils'), L('Share of pool', 'Part du bassin'), L('At or above the band’s floor', 'Au plancher de la tranche ou plus')],
    BANDS.map(([k, lo, hi]) => [bandName(lo, hi), fmt(latest.count[k]), pct1(latest.count[k] / latest.total), fmt(above(latest, lo))]),
  );
  const top = latest.count['601–1200'];
  const over500 = above(latest, 501);
  const mid = latest.count['451–500'];
  const under400 = upTo(latest, 400);
  const under450 = upTo(latest, 450);
  const biggest = BANDS.reduce((a, b) => (latest.count[b[0]] > latest.count[a[0]] ? b : a));
  check(pre26.every((s) => BANDS.every(([k]) => k === '451–500' || s.count[k] < s.count['451–500'])), '451 to 500 was the largest band in every 2026 snapshot');
  check(under400 / latest.total > 0.3 && under400 / latest.total < 0.34, 'about a third of profiles scored 400 or less');
  check(under450 / latest.total > 0.55 && under450 / latest.total < 0.65, 'about three in five profiles scored 450 or less');

  // ------------------------------------------------ month by month, 2026
  const months = [...new Set(pre26.map((s) => s.date.slice(0, 7)))];
  const monthly = months.map((m) => pre26.filter((s) => s.date.startsWith(m)).at(-1));
  const row = (s, label) => [label, shortDate(s.date), fmt(s.total), fmt(above(s, 501)), pct1(above(s, 501) / s.total), fmt(s.count['451–500']), fmt(upTo(s, 400))];
  const monthTable = table(
    [L('Month', 'Mois'), L('Snapshot', 'Instantané'), L('Profiles', 'Profils'), L('Above 500', 'Plus de 500'), L('Share above 500', 'Part au-dessus de 500'), L('451–500', '451 à 500'), L('400 or less', '400 ou moins')],
    [row(base, L(`Baseline: ${monthName(base.date.slice(0, 7))}`, `Point de départ : ${monthName(base.date.slice(0, 7)).toLowerCase()}`)), ...monthly.map((s) => row(s, monthName(s.date.slice(0, 7))))],
  );
  const share = (s) => above(s, 501) / s.total;
  const low = pre26.reduce((a, b) => (share(b) < share(a) ? b : a));
  const high26 = pre26.reduce((a, b) => (b.total > a.total ? b : a));
  check(share(first) > share(low) && share(latest) > share(low) && low.date >= '2026-03-01' && low.date <= '2026-03-31', 'the share above 500 fell to its low in March, then rebuilt');
  check(share(latest) > share(first), 'the share above 500 ended October higher than in early January');
  check(latest.total < first.total && high26.date.startsWith('2026-06'), 'the pool peaked in June and ended smaller than in January');

  // Invitations issued between the first 2026 snapshot and the latest one.
  const between = all.filter((r) => r.date > first.date && r.date <= latest.date);
  const invited = between.reduce((n, r) => n + r.size, 0);
  const shrink = first.total - latest.total;
  check(shrink > 0 && shrink < invited / 10, 'the pool shrank by a small fraction of the invitations issued');

  // CEC: the big early-year rounds against the share above 500.
  const isCec = (r) => /canadian experience/i.test(r.label || r.name);
  const cecQ1 = all.filter((r) => isCec(r) && r.date >= '2026-01-01' && r.date < '2026-04-01');
  const cecQ1Itas = cecQ1.reduce((n, r) => n + r.size, 0);
  const cecLater = all.filter((r) => isCec(r) && r.date >= '2026-04-01' && r.date <= latest.date);
  const cecLaterItas = cecLater.reduce((n, r) => n + r.size, 0);
  const q1Lo = Math.min(...cecQ1.map((r) => r.crs)), q1Hi = Math.max(...cecQ1.map((r) => r.crs));
  check(q1Lo > 500 && q1Hi <= 520, 'first-quarter CEC cutoffs sat just above 500');
  check(cecQ1Itas / cecQ1.length > 2 * (cecLaterItas / cecLater.length), 'CEC rounds from April were much smaller than in the first quarter');
  check(upTo(latest, 400) < upTo(first, 400), 'profiles at 400 or less fell during the year');

  // ------------------------------------------------ recent cutoffs against the pool
  // A round's own snapshot (taken just before it) against its cutoff. The bands only give
  // a range: the band the cutoff falls in is counted in the upper figure only.
  const snapOf = (r) => byDate.get(isoOf(r.poolAsOf));
  const lastN = (re, n) => all.filter((r) => re.test(r.label || r.name) && r.poolAsOf).slice(0, n).reverse();
  const cecR = lastN(/canadian experience/i, 3), frR = lastN(/french/i, 3);
  const bounds = (r) => { const s = snapOf(r); return [above(s, r.crs), s.total - upTo(s, r.crs - 1)]; };
  const cutRow = (r, kind) => { const [lo, hi] = bounds(r); return [kind, L(`#${r.number}`, `n° ${r.number}`), shortDate(r.date), String(r.crs), fmt(r.size), lo === hi ? fmt(lo) : L(`${fmt(lo)} to ${fmt(hi)}`, `${fmt(lo)} à ${fmt(hi)}`)]; };
  const cutTable = table(
    [L('Round type', 'Type de ronde'), L('Round', 'Ronde'), L('Date', 'Date'), L('Cutoff', 'Score minimal'), L('Invited', 'Invitations'), L('Profiles in the pool at or above the cutoff', 'Profils du bassin au score minimal ou plus')],
    [...cecR.map((r) => cutRow(r, L('Canadian Experience Class', 'Catégorie de l’expérience canadienne'))), ...frR.map((r) => cutRow(r, L('French-language proficiency', 'Compétence en français')))],
  );
  const lastCec = cecR.at(-1);
  check(cecR.every((r) => r.crs > 500 && r.crs <= 600), 'recent CEC cutoffs fell in the 501 to 600 band');
  check(Math.max(...frR.map((r) => r.crs)) < Math.min(...cecR.map((r) => r.crs)), 'French cutoffs sat below CEC cutoffs');
  check(cecR.every((r) => r.size < bounds(r)[1]) && frR.every((r) => r.size < bounds(r)[0]), 'each round invited fewer people than the profiles above its cutoff');

  // ------------------------------------------------ the 601+ band and PNP rounds
  const isPnp = (r) => /provincial nominee/i.test(r.label || r.name);
  const pnp26 = all.filter((r) => isPnp(r) && r.date >= '2026-01-01' && r.poolAsOf).reverse();
  const fresh = pnp26.filter((r) => { const g = daysBetween(isoOf(r.poolAsOf), r.date); return g >= 0 && g <= 2; });
  const close = fresh.filter((r) => Math.abs(r.size / snapOf(r).count['601–1200'] - 1) <= 0.03);
  check(close.length === fresh.length && fresh.length >= pnp26.length - 2, 'PNP round sizes matched the 601+ band within 3% whenever the snapshot was fresh');
  const lastPnp = pnp26.at(-1);

  // ------------------------------------------------ low cutoffs
  const r26 = all.filter((r) => r.date >= '2026-01-01');
  const lowRounds = r26.filter((r) => r.crs <= 400);
  const lowNonPhys = lowRounds.filter((r) => !/physician/i.test(r.label || r.name));
  const lowItas = lowRounds.reduce((n, r) => n + r.size, 0);
  const lowTypes = [...new Set(lowRounds.map((r) => (/french/i.test(r.label) ? 'fr' : /physician/i.test(r.label) ? 'phys' : /senior/i.test(r.label) ? 'mgr' : /military/i.test(r.label) ? 'mil' : 'other')))];
  check(!lowTypes.includes('other'), 'every 2026 round with a cutoff of 400 or less was a French, physicians, senior managers or military round');
  const lowMin = lowNonPhys.reduce((a, b) => (b.crs < a.crs ? b : a));
  const lowMinName = /military/i.test(lowMin.label) ? ['military recruits', 'pour les recrues militaires'] : /senior/i.test(lowMin.label) ? ['senior managers', 'pour les cadres supérieurs'] : /french/i.test(lowMin.label) ? ['French-language', 'en français'] : null;
  check(lowMinName && lowMin.crs > 350, 'the lowest non-physician cutoff of 2026 was above 350');
  const under350 = upTo(latest, 350);

  // ------------------------------------------------ after November 3
  const postTable = post.length ? table(
    [L('Snapshot', 'Instantané'), L('Profiles', 'Profils'), ...BANDS.map(([, lo, hi]) => bandName(lo, hi))],
    post.map((s) => [shortDate(s.date), fmt(s.total), ...BANDS.map(([k]) => fmt(s.count[k]))]),
  ) : '';
  const lastRound = all[0];

  const faq = [
    [L('How many profiles are in the Express Entry pool?', 'Combien de profils y a-t-il dans le bassin d’Entrée express ?'),
      L(`${fmt(latest.total)} on ${longDate(latest.date)}, the latest snapshot IRCC published before the November 3, 2026 CRS change. During 2026 the total moved between ${fmt(Math.min(...pre26.map((s) => s.total)))} and ${fmt(high26.total)}.`,
        `${fmt(latest.total)} au ${longDate(latest.date)}, le dernier instantané publié par IRCC avant le changement du CRS du 3 novembre 2026. En 2026, le total a varié entre ${fmt(Math.min(...pre26.map((s) => s.total)))} et ${fmt(high26.total)}.`)],
    [L('What share of the pool scores above 500?', 'Quelle part du bassin a plus de 500 points ?'),
      L(`${pct1(share(latest))} on ${longDate(latest.date)} (${fmt(over500)} profiles). It fell to ${pct1(share(low))} on ${longDate(low.date)}, after the large CEC rounds early in the year, and rose again from April.`,
        `${pct1(share(latest))} au ${longDate(latest.date)} (${fmt(over500)} profils). Elle est tombée à ${pct1(share(low))} le ${longDate(low.date)}, après les grandes rondes CEC du début d’année, puis a remonté à partir d’avril.`)],
    [L('Can I tell how many people are ahead of me for a CEC or French round?', 'Puis-je savoir combien de personnes me devancent pour une ronde CEC ou en français ?'),
      L('Not exactly. IRCC publishes the pool for all profiles together, in score bands, and not by program or category. The counts include people who are not eligible for a given round, so they overstate the competition for it.',
        'Pas exactement. IRCC publie le bassin pour l’ensemble des profils, par tranches de score, et non par programme ou par catégorie. Les chiffres incluent des personnes non admissibles à une ronde donnée ; ils surestiment donc la concurrence pour cette ronde.')],
    [L('Can I compare pool snapshots from before and after November 3, 2026?', 'Peut-on comparer les instantanés du bassin d’avant et d’après le 3 novembre 2026 ?'),
      L('No. On November 3, 2026 the CRS changed and IRCC recalculated every profile in the pool. A snapshot taken after that date uses a different scale, so a change between the two reflects the new rules as much as any change in who is in the pool.',
        'Non. Le 3 novembre 2026, le CRS a changé et IRCC a recalculé chaque profil du bassin. Un instantané pris après cette date utilise une autre échelle ; un écart entre les deux reflète autant les nouvelles règles qu’un changement dans la composition du bassin.')],
  ];
  const faqMd = faq.map(([q, a]) => `### ${q}\n\n${a}`).join('\n\n');

  const postEn = post.length
    ? `IRCC has published ${post.length} snapshot${post.length === 1 ? '' : 's'} on the new scale. They are shown on their own, and are not compared with the table above:\n\n${postTable}`
    : `This article stops at round #${lastRound.number} on ${longDate(lastRound.date)}, so every snapshot in it is on the old scale. The first rescored snapshot will come with the first round after the pause.`;
  const postFr = post.length
    ? `IRCC a publié ${post.length} instantané${post.length === 1 ? '' : 's'} sur la nouvelle échelle. Ils sont présentés à part et ne sont pas comparés au tableau ci-dessus :\n\n${postTable}`
    : `Cet article s’arrête à la ronde n° ${lastRound.number} du ${longDate(lastRound.date)} ; tous ses instantanés sont donc sur l’ancienne échelle. Le premier instantané recalculé arrivera avec la première ronde après la pause.`;

  const md = L(`# Inside the Express Entry pool: where CRS scores sit

Every time IRCC holds a round of invitations, it also publishes a snapshot of the Express Entry pool: how many profiles sit in each CRS score band. This article reads those snapshots. You will see where the ${fmt(latest.total)} profiles sat on ${longDate(latest.date)}, how the pool moved through 2026, how many profiles scored at or above recent CEC and French cutoffs, and why the CRS change on November 3, 2026 starts a new series that cannot be compared with the old one.

All figures come from the pool snapshots IRCC published with its rounds, up to round #${lastRound.number} on ${longDate(lastRound.date)}. For live numbers, the [analytics page](/analytics) places any score against the newest snapshot.

## What the bands mean

IRCC groups profiles into seven CRS bands. A provincial nomination adds 600 points, so nominees land in the top band, ${bandName(601, 1200)}; as shown further down, that band tracks the size of PNP rounds closely. The other six cover the ordinary range of scores. IRCC splits the 451–500 and 401–450 bands more finely on its own page; this article uses the seven top-level bands.

A snapshot counts **profiles**, not people who will be invited. There is no minimum CRS score to enter the pool: anyone who meets a program's requirements can create a profile, whatever their score. A profile stays valid for 12 months, as the [step-by-step process guide](/express-entry-process) explains. So each snapshot mixes candidates who just arrived, candidates about to expire, and everyone in between.

## Where scores sat on ${longDate(latest.date)}

${distTable}

The ${bandName(451, 500)} band was the largest, with ${fmt(mid)} profiles (${pct(mid / latest.total)}), and it was the largest in every 2026 snapshot. Only ${fmt(over500)} profiles (${pct1(share(latest))}) scored above 500. At the other end, ${fmt(under400)} profiles (${pct(under400 / latest.total)}) scored 400 or less, and ${fmt(under450)} (${pct(under450 / latest.total)}) scored 450 or less.

## How the pool moved in 2026

One row per month, using the last snapshot IRCC published in that month. The first row is the last snapshot of 2025, for reference.

${monthTable}

**The total barely moved.** The pool held ${fmt(first.total)} profiles on ${longDate(first.date)} and ${fmt(latest.total)} on ${longDate(latest.date)}, ${fmt(shrink)} fewer. Between those two snapshots, ${between.length} rounds issued ${fmt(invited)} invitations. IRCC does not publish how many profiles joined, expired or were removed, so the flows cannot be separated. What the numbers do show is that the pool is not a fixed queue that rounds work through: invitations went out by the tens of thousands while the total stayed within a few percent. The largest total of the year was ${fmt(high26.total)}, on ${longDate(high26.date)}.

**The share above 500 fell, then rebuilt.** It went from ${pct1(share(first))} on ${longDate(first.date)} to a low of ${pct1(share(low))} on ${longDate(low.date)}. That lines up with the CEC rounds of the first quarter: ${cecQ1.length} rounds from January to March invited ${fmt(cecQ1Itas)} candidates, with cutoffs from ${q1Lo} to ${q1Hi}. From April to October, ${cecLater.length} CEC rounds invited ${fmt(cecLaterItas)} in total, and the band above 500 refilled to ${pct1(share(latest))} by ${longDate(latest.date)}.

**The bottom of the pool thinned.** Profiles at 400 or less went from ${fmt(upTo(first, 400))} on ${longDate(first.date)} to ${fmt(under400)}. The snapshots alone do not say why.

## How many profiles sat above recent cutoffs

Each round's cutoff against the snapshot IRCC published with it. Because the bands are wide, the count is a range: the lower figure counts only the bands entirely above the cutoff, the upper figure adds the band the cutoff falls in.

${cutTable}

Two cautions. First, these counts cover the whole pool, not the people eligible for that round. A CEC round only invites candidates with Canadian work experience, and a French round only those with the required French test results. IRCC does not publish the pool by program or category, so the real competition for a round is smaller than these numbers. Second, the CEC cutoff of ${lastCec.crs} on ${longDate(lastCec.date)} sits inside a band that runs from 501 to 600, so the snapshot cannot say how many profiles were between 501 and ${lastCec.crs - 1}.

## The top band and PNP rounds

The ${bandName(601, 1200)} band behaves differently. In ${close.length} of the ${pnp26.length} PNP rounds of 2026, IRCC published a snapshot one or two days before the round, and each time the round invited within 3% of the number of profiles in that band. On ${longDate(isoOf(lastPnp.poolAsOf))}, the band held ${fmt(snapOf(lastPnp).count['601–1200'])} profiles; the PNP round on ${longDate(lastPnp.date)} invited ${fmt(lastPnp.size)}. In 2026, PNP rounds in effect invited nearly everyone in that band.

## Why so many profiles sit far below any cutoff

In 2026, ${lowRounds.length} rounds had a cutoff of 400 or less, and together they invited ${fmt(lowItas)} candidates. All of them were French-language, physicians, senior managers or military recruit rounds, which only invite people eligible for that category. Apart from the physicians rounds, the lowest cutoff was ${lowMin.crs}, in a ${lowMinName[0]} round that invited ${fmt(lowMin.size)} ${lowMin.size === 1 ? "person" : "people"}. Meanwhile ${fmt(under350)} profiles (${pct(under350 / latest.total)}) scored 350 or less on ${longDate(latest.date)}.

A profile that is not invited expires after 12 months. Until then, a provincial nomination, a better test result or more experience can raise its score, and only a score or category that matches a round leads to an invitation.

## After November 3, 2026: a new scale

On November 3, 2026, the CRS changed: it adds points for high-wage work experience and job offers, and IRCC recalculated every profile in the pool. IRCC said rounds would pause while the recalculation ran, for up to two weeks. See [what changed](/express-entry-changes-2026).

A snapshot dated after November 3 counts the same people on a different scale. Comparing it with the ${longDate(latest.date)} snapshot would mix two things: the new points and normal changes in the pool.

${postEn}

## What this means for you

- **Find your band, not just your score.** If you score between 451 and 500, you were in the most crowded part of the pool all year. The [CRS calculator](/crs-calculator) and the guide to [improving your CRS score](/improve-crs-score) show where the points are.
- **Do not read the band counts as your queue.** Many people above you are not eligible for the rounds you qualify for. Your category matters as much as your score: French test results, for example, opened rounds with cutoffs between ${Math.min(...frR.map((r) => r.crs))} and ${Math.max(...frR.map((r) => r.crs))} in the last three French rounds. See the [language test guide](/language-tests-clb).
- **Watch the dates.** Your profile lasts 12 months. If it is close to expiry, plan to create a new one.
- **Wait for the new scale before comparing.** After November 3, compare your recalculated score with cutoffs from rounds held after the change, on the [draws page](/draws), not with the older ones in this article.

For the round-by-round story of 2026, see the [2026 review](/express-entry-2026-review).

## Common questions

${faqMd}

## Sources

- IRCC, [Express Entry rounds of invitations](${IRCC_ROUNDS}): results and the CRS score distribution published with each round, up to round #${lastRound.number} (${longDate(lastRound.date)}), snapshot of ${longDate(latest.date)}
- IRCC, [Canada refocusing Express Entry on top talent that drives economic growth](${IRCC_CHANGES}), October 16, 2026: the November 3 CRS change, the recalculation and the pause in rounds
`, `# Dans le bassin d’Entrée express : où se situent les scores CRS

Chaque fois qu’IRCC tient une ronde d’invitations, il publie aussi un instantané du bassin d’Entrée express : le nombre de profils dans chaque tranche de score CRS. Cet article lit ces instantanés. Vous verrez où se situaient les ${fmt(latest.total)} profils au ${longDate(latest.date)}, comment le bassin a évolué en 2026, combien de profils avaient un score égal ou supérieur aux scores minimaux récents de la CEC et des rondes en français, et pourquoi le changement du CRS du 3 novembre 2026 ouvre une nouvelle série qu’on ne peut pas comparer à l’ancienne.

Tous les chiffres viennent des instantanés du bassin publiés par IRCC avec ses rondes, jusqu’à la ronde n° ${lastRound.number} du ${longDate(lastRound.date)}. Pour les chiffres à jour, la [page d’analyse](/analytics) situe n’importe quel score par rapport au plus récent instantané.

## Ce que veulent dire les tranches

IRCC regroupe les profils en sept tranches de score CRS. Une désignation provinciale ajoute 600 points ; les candidats désignés se retrouvent donc dans la tranche du haut, de ${bandName(601, 1200)}. Comme on le verra plus bas, cette tranche suit de près la taille des rondes du PCP. Les six autres couvrent l’éventail habituel des scores. Sur sa propre page, IRCC divise plus finement les tranches de 451 à 500 et de 401 à 450 ; cet article utilise les sept tranches principales.

Un instantané compte des **profils**, pas des personnes qui seront invitées. Il n’y a pas de score CRS minimal pour entrer dans le bassin : toute personne qui remplit les exigences d’un programme peut créer un profil, quel que soit son score. Un profil reste valide 12 mois, comme l’explique le [guide du processus étape par étape](/express-entry-process). Chaque instantané mêle donc des candidats tout juste arrivés, d’autres dont le profil va expirer, et tous ceux entre les deux.

## La répartition des scores au ${longDate(latest.date)}

${distTable}

La tranche de ${bandName(451, 500)} était la plus nombreuse, avec ${fmt(mid)} profils (${pct(mid / latest.total)}), et elle l’a été dans chaque instantané de 2026. Seulement ${fmt(over500)} profils (${pct1(share(latest))}) avaient plus de 500 points. À l’autre bout, ${fmt(under400)} profils (${pct(under400 / latest.total)}) avaient 400 points ou moins, et ${fmt(under450)} (${pct(under450 / latest.total)}) 450 points ou moins.

## L’évolution du bassin en 2026

Une ligne par mois, avec le dernier instantané publié par IRCC dans le mois. La première ligne reprend le dernier instantané de 2025, à titre de repère.

${monthTable}

**Le total a peu bougé.** Le bassin comptait ${fmt(first.total)} profils le ${longDate(first.date)} et ${fmt(latest.total)} le ${longDate(latest.date)}, soit ${fmt(shrink)} de moins. Entre ces deux instantanés, ${between.length} rondes ont envoyé ${fmt(invited)} invitations. IRCC ne publie pas le nombre de profils entrés, expirés ou retirés ; on ne peut donc pas séparer ces flux. Ce que les chiffres montrent, c’est que le bassin n’est pas une file fixe que les rondes vident peu à peu : les invitations se sont comptées par dizaines de milliers, alors que le total n’a varié que de quelques points de pourcentage. Le total le plus élevé de l’année a été de ${fmt(high26.total)}, le ${longDate(high26.date)}.

**La part au-dessus de 500 a baissé, puis s’est reconstituée.** Elle est passée de ${pct1(share(first))} le ${longDate(first.date)} à un creux de ${pct1(share(low))} le ${longDate(low.date)}. Cela coïncide avec les rondes CEC du premier trimestre : de janvier à mars, ${cecQ1.length} rondes ont invité ${fmt(cecQ1Itas)} candidats, avec des scores minimaux de ${q1Lo} à ${q1Hi}. D’avril à octobre, ${cecLater.length} rondes CEC en ont invité ${fmt(cecLaterItas)} au total, et la tranche au-dessus de 500 s’est remplie de nouveau, jusqu’à ${pct1(share(latest))} au ${longDate(latest.date)}.

**Le bas du bassin s’est aminci.** Les profils à 400 points ou moins sont passés de ${fmt(upTo(first, 400))} le ${longDate(first.date)} à ${fmt(under400)}. Les instantanés seuls n’en disent pas la raison.

## Combien de profils dépassaient les scores minimaux récents

Le score minimal de chaque ronde, comparé à l’instantané publié par IRCC avec elle. Comme les tranches sont larges, le nombre est une fourchette : le chiffre bas compte seulement les tranches entièrement au-dessus du score minimal, le chiffre haut y ajoute la tranche où tombe ce score.

${cutTable}

Deux mises en garde. D’abord, ces chiffres couvrent tout le bassin, pas les personnes admissibles à la ronde. Une ronde CEC n’invite que des candidats ayant une expérience de travail canadienne, et une ronde en français, seulement ceux qui ont les résultats de test de français exigés. IRCC ne publie pas le bassin par programme ou par catégorie ; la concurrence réelle pour une ronde est donc plus faible que ces chiffres. Ensuite, le score minimal CEC de ${lastCec.crs} du ${longDate(lastCec.date)} tombe dans une tranche qui va de 501 à 600 : l’instantané ne permet pas de savoir combien de profils se trouvaient entre 501 et ${lastCec.crs - 1}.

## La tranche du haut et les rondes du PCP

La tranche de ${bandName(601, 1200)} se comporte autrement. Pour ${close.length} des ${pnp26.length} rondes du PCP de 2026, IRCC avait publié un instantané un ou deux jours avant la ronde, et chaque fois la ronde a invité un nombre de candidats à 3 % près égal au nombre de profils de cette tranche. Au ${longDate(isoOf(lastPnp.poolAsOf))}, la tranche comptait ${fmt(snapOf(lastPnp).count['601–1200'])} profils ; la ronde du PCP du ${longDate(lastPnp.date)} en a invité ${fmt(lastPnp.size)}. En 2026, les rondes du PCP ont en pratique invité presque tous les profils de cette tranche.

## Pourquoi tant de profils sont loin de tout score minimal

En 2026, ${lowRounds.length} rondes ont eu un score minimal de 400 ou moins ; elles ont invité ensemble ${fmt(lowItas)} candidats. Toutes étaient des rondes en français, pour les médecins, pour les cadres supérieurs ou pour les recrues militaires, qui n’invitent que les personnes admissibles à cette catégorie. À part les rondes pour les médecins, le score minimal le plus bas a été de ${lowMin.crs}, dans une ronde ${lowMinName[1]} qui a invité ${fmt(lowMin.size)} personne${lowMin.size === 1 ? "" : "s"}. Pendant ce temps, ${fmt(under350)} profils (${pct(under350 / latest.total)}) avaient 350 points ou moins au ${longDate(latest.date)}.

Un profil qui n’est pas invité expire après 12 mois. D’ici là, une désignation provinciale, un meilleur résultat de test ou plus d’expérience peuvent faire monter son score, et seul un score ou une catégorie qui correspond à une ronde mène à une invitation.

## Après le 3 novembre 2026 : une nouvelle échelle

Le 3 novembre 2026, le CRS a changé : il ajoute des points pour l’expérience de travail et les offres d’emploi dans une profession à salaire élevé, et IRCC a recalculé chaque profil du bassin. IRCC a indiqué que les rondes seraient suspendues pendant le recalcul, jusqu’à deux semaines. Voir [ce qui a changé](/express-entry-changes-2026).

Un instantané daté d’après le 3 novembre compte les mêmes personnes sur une autre échelle. Le comparer à celui du ${longDate(latest.date)} mélangerait deux choses : les nouveaux points et l’évolution normale du bassin.

${postFr}

## Ce que cela veut dire pour vous

- **Repérez votre tranche, pas seulement votre score.** Si votre score est entre 451 et 500, vous étiez dans la partie la plus peuplée du bassin toute l’année. Le [calculateur CRS](/crs-calculator) et le guide pour [améliorer votre score CRS](/improve-crs-score) montrent où sont les points.
- **Ne lisez pas les chiffres des tranches comme votre file d’attente.** Beaucoup de personnes au-dessus de vous ne sont pas admissibles aux rondes auxquelles vous l’êtes. Votre catégorie compte autant que votre score : les résultats de test de français, par exemple, ont ouvert des rondes avec des scores minimaux entre ${Math.min(...frR.map((r) => r.crs))} et ${Math.max(...frR.map((r) => r.crs))} lors des trois dernières rondes en français. Voir le [guide des tests de langue](/language-tests-clb).
- **Surveillez les dates.** Votre profil dure 12 mois. S’il approche de l’expiration, prévoyez d’en créer un nouveau.
- **Attendez la nouvelle échelle avant de comparer.** Après le 3 novembre, comparez votre score recalculé aux scores minimaux des rondes tenues après le changement, sur la [page des tirages](/draws), et non aux anciens chiffres de cet article.

Pour le récit ronde par ronde de 2026, voir le [bilan 2026](/express-entry-2026-review).

## Questions fréquentes

${faqMd}

## Sources

- IRCC, [Rondes d’invitations d’Entrée express](${IRCC_ROUNDS}) (en anglais) : résultats et répartition des scores CRS publiés avec chaque ronde, jusqu’à la ronde n° ${lastRound.number} (${longDate(lastRound.date)}), instantané du ${longDate(latest.date)}
- IRCC, [Canada refocusing Express Entry on top talent that drives economic growth](${IRCC_CHANGES}) (communiqué en anglais), 16 octobre 2026 : le changement du CRS du 3 novembre, le recalcul et la pause des rondes
`);

  return {
    file: 'express-entry-pool', path: '/express-entry-pool', priority: '0.8', reviewed: REVIEWED,
    title: L('Inside the Express Entry Pool: Where CRS Scores Sit', 'Dans le bassin d’Entrée express : où sont les scores CRS'),
    label: L('Inside the Express Entry Pool', 'Dans le bassin d’Entrée express'),
    faq,
    description: L(`Where the ${fmt(latest.total)} Express Entry profiles sat by CRS band, how the pool moved in 2026, and why post-November 3 snapshots use a new scale.`,
      `Où se situaient les ${fmt(latest.total)} profils d’Entrée express par tranche CRS, l’évolution du bassin en 2026 et la nouvelle échelle après le 3 novembre.`),
    llm: `Analysis of IRCC's Express Entry pool snapshots (CRS score distribution) up to ${latest.date}: the latest distribution by band, month-by-month totals and share above 500 in 2026, profiles above recent CEC and French cutoffs, the 601+ band vs PNP rounds, and why snapshots after the November 3, 2026 CRS change are on a different scale.`,
    short: L('Where CRS scores sit, and how the pool moved', 'Où sont les scores CRS et comment le bassin a bougé'),
    related: ['express-entry-2026-review', 'express-entry-changes-2026', 'improve-crs-score'],
    md,
  };
}
