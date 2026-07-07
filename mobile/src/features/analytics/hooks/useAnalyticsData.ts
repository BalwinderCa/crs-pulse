import { useMemo } from 'react';
import { parseISO } from 'date-fns';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useDrawsStore } from '@/store/drawsStore';
import { useProfileStore, DEFAULT_CALC_INPUTS, type CalcInputs } from '@/store/profileStore';
import { useProcessingTimesStore } from '@/store/processingTimesStore';
import { useEePoolStore } from '@/store/eePoolStore';
import { computePoolPosition } from '@/features/analytics/data/eePool';
import { buildCRSInput, LANG_TEST_MAP } from '@/features/onboarding/utils/buildCRSInput';
import { calculateCRS, scoresToCLB, type TefScale } from '@/features/onboarding/utils/crsCalculator';
import { CATEGORY_LABELS } from '@/constants';

/**
 * Analytics view-model. EVERY value is derived from a real source:
 *   - the live IRCC draws feed (drawsStore) — cutoffs, sizes, cadence, mix, YTD;
 *   - the IRCC processing-times mirror (processingTimesStore) — inventory + ETA;
 *   - the IRCC pool-composition / Levels-Plan mirror (eePoolStore) — place in
 *     line, pool distribution, annual targets.
 * No per-user number is invented. When a feed is briefly unreachable, its store
 * supplies a dated, sourced bundled snapshot (never fabricated per-user data).
 */

const DAY = 86_400_000;
const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((s, v) => s + v, 0) / xs.length) : 0);
const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)]!;
};
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const fmt = (n: number) => n.toLocaleString('en-CA');
const label = (code: string) => CATEGORY_LABELS[code] ?? code;

// IRCC processing-times keys per profile category (used for inventory + ETA).
const PROC_KEY: Record<string, string> = {
  CEC: 'ee_cec', General: 'ee_fsw', FSW: 'ee_fsw', FST: 'ee_fsw', PNP: 'ee_pnp',
  Healthcare: 'ee_cec', STEM: 'ee_cec', Trades: 'ee_fsw', French: 'ee_cec',
  Agriculture: 'ee_cec', Education: 'ee_cec',
};

// Sourced fallback for EE inventory/ETA (mirrors data/processing-times.json),
// used only when the live processing-times feed is briefly unreachable.
const EE_PROC_FALLBACK: Record<string, { months: number; peopleWaiting: number }> = {
  ee_cec: { months: 7, peopleWaiting: 60_900 },
  ee_fsw: { months: 7, peopleWaiting: 52_000 },
  ee_pnp: { months: 6, peopleWaiting: 14_000 },
};

const drawCategoryFor = (cat: string) => (cat === 'FSW' ? 'General' : cat === 'FST' ? 'Trades' : cat);

const SKILL_LABEL = { speaking: 'Speaking', listening: 'Listening', reading: 'Reading', writing: 'Writing' } as const;
type Skill = keyof typeof SKILL_LABEL;

/**
 * Personalised "how to improve" levers — each is a REAL CRS recompute via the
 * official calculator against the user's saved profile, so the shown delta is
 * exactly what that change would add. Levers already achieved (Δ ≤ 0, e.g. a
 * skill that's already maxed) are dropped, and the rest are ranked by impact.
 */
function improvementPaths(inputs: CalcInputs, t: TFunction): { label: string; delta: string }[] {
  const score = (di: CalcInputs) => calculateCRS(buildCRSInput(di)).total;
  const base = score(inputs);

  const firstTest = LANG_TEST_MAP[inputs.firstLangTest] ?? 'IELTS';
  const tefScale = (inputs.tefScale ?? 'current') as TefScale;
  const firstClb = scoresToCLB(
    firstTest,
    {
      speaking: Number(inputs.firstLangSpeaking) || 0,
      listening: Number(inputs.firstLangListening) || 0,
      reading: Number(inputs.firstLangReading) || 0,
      writing: Number(inputs.firstLangWriting) || 0,
    },
    tefScale,
  );
  // Lossless CLB form of the first language so a single skill can be bumped
  // without re-deriving raw test thresholds (toCLB('CLB', …) is the identity).
  const clbBase: CalcInputs = {
    ...inputs,
    firstLangTest: 'CLB',
    firstLangSpeaking: firstClb.speaking,
    firstLangListening: firstClb.listening,
    firstLangReading: firstClb.reading,
    firstLangWriting: firstClb.writing,
  };

  const candidates: { label: string; total: number }[] = [];

  // Raise the single weakest English skill by one CLB level (if any room left).
  const skills: Skill[] = ['speaking', 'listening', 'reading', 'writing'];
  const weakest: Skill = skills.reduce((w, s) => (firstClb[s] < firstClb[w] ? s : w), skills[0]!);
  const weakestClb = firstClb[weakest];
  if (weakestClb < 10) {
    const di: CalcInputs = { ...clbBase };
    (di as Record<string, unknown>)[`firstLang${SKILL_LABEL[weakest]}`] = weakestClb + 1;
    candidates.push({       label: t('analytics.weakSkillBoost', { skill: t(`skills.${weakest}`), clb: weakestClb + 1 }), total: score(di) });
  }

  // Add NCLC 7 French (only if the user isn't already taking a French test).
  const hasFrench =
    firstTest === 'TEF' ||
    firstTest === 'TCF' ||
    (inputs.hasSecondLang && (inputs.secondLangTest === 'TEF' || inputs.secondLangTest === 'TCF'));
  if (!hasFrench) {
    candidates.push({
      label: t('analytics.frenchBoost'),
      total: score({
        ...inputs,
        hasSecondLang: true,
        secondLangTest: 'TCF',
        secondLangSpeaking: 10,
        secondLangListening: 458,
        secondLangReading: 453,
        secondLangWriting: 10,
      }),
    });
  }

  // One more year of Canadian work experience (CRS caps the factor at 5 years).
  if (inputs.canadianWorkExp < 5) {
    candidates.push({
      label: t('analytics.canadianWorkBoost', { years: inputs.canadianWorkExp + 1 }),
      total: score({ ...inputs, canadianWorkExp: (inputs.canadianWorkExp + 1) as CalcInputs['canadianWorkExp'] }),
    });
  }

  // Provincial nomination (the single biggest lever, if not already held).
  if (!inputs.hasProvincialNomination) {
    candidates.push({ label: t('analytics.pnpBoost'), total: score({ ...inputs, hasProvincialNomination: true }) });
  }

  return candidates
    .map((c) => ({ label: c.label, delta: c.total - base }))
    .filter((c) => c.delta > 0)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 3)
    .map((c) => ({ label: c.label, delta: `+${c.delta}` }));
}

export function useAnalyticsData() {
  const { t, i18n } = useTranslation();
  const draws = useDrawsStore((s) => s.draws);
  const profile = useProfileStore((s) => s.profile);
  const procTimes = useProcessingTimesStore((s) => s.times);
  const eePool = useEePoolStore((s) => s.data);

  return useMemo(() => {
    const localeStr = i18n.language === 'fr' ? 'fr-CA' : 'en-CA';
    const mfmt = (idx: number) =>
      new Date(2025, idx, 1).toLocaleDateString(localeStr, { month: 'short' }).replace('.', '');
    const score = profile?.crs_score ?? 0;
    const categoryCode = profile?.category ?? 'CEC';
    // Personalised improvement levers (independent of draws — uses the profile).
    const inputs = profile?.calculatorInputs ?? DEFAULT_CALC_INPUTS;
    const paths = improvementPaths(inputs, t);

    // ── Place in line + pool + annual targets (live mirror, dated snapshot) ──
    const position = computePoolPosition(eePool, score);
    const procKey = PROC_KEY[categoryCode] ?? 'ee_cec';
    const proc = procTimes?.[procKey] ?? EE_PROC_FALLBACK[procKey] ?? EE_PROC_FALLBACK.ee_cec!;
    const myInventory = proc.peopleWaiting ?? 0;
    const estMonths = proc.months ?? 0;

    const poolComposition = position.bands.map((b) => ({ label: b.band, value: b.count, mine: b.mine }));
    const baseIrcc = {
      peopleAhead: position.peopleAhead,
      candidatesAtOrAbove: position.atOrAbove,
      poolTotal: position.poolTotal,
      poolAsOf: eePool.updated,
      poolSource: eePool.source,
      myInventory,
      estMonths,
      prTarget: eePool.levels.prTarget,
      poolComposition,
    };

    if (draws.length === 0) {
      // No draws yet — still return real pool/target data with neutral live bits.
      const nowYear = new Date().getFullYear();
      return {
        category: label(categoryCode),
        userScore: score,
        trendCutoff: 0,
        oddsFraction: 0.5,
        oddsLabel: 'Moderate',
        timeframe: '—',
        gapText: '—',
          paths,
          forecast: { actual: [] as number[], proj: [] as number[], band: [] as { lo: number; hi: number }[], min: 450, max: 550, likely: '—', confidence: t('analytics.lowConfidence') },
        trend: [] as number[],
        categoryTrends: { CEC: [] as number[], French: [] as number[], PNP: [] as number[] },
        invitationsTrend: [] as number[],
        trendMin: 300,
        trendMax: 700,
        selfTrendMin: 300,
        selfTrendMax: 700,
        cadenceDays: 0,
        cadence: [] as number[],
        invitationsYtd: '—',
        volume: [] as number[],
        percentile: 0,
        streams: [] as { label: string; cutoff: number; margin: number }[],
        byMonth: new Array(12).fill(0) as number[],
        distribution: [] as { label: string; value: number; mine?: boolean }[],
        byScoreBand: [] as { band: string; wait: string; mine?: boolean }[],
        momentum: [] as number[],
        avgInvitations: '—',
        busiestMonth: '—',
        quietestMonth: '—',
        momentumDown: true,
        ircc: {
          ...baseIrcc,
          curYear: nowYear, prevYear: nowYear - 1,
          nextDrawWindow: '—', nextDrawLikely: '—', daysSinceLast: 0, avgGap: 0,
          typicalSize: '—', itaYtd: 0, itaProjected: 0, itaPrevYear: 0,
          categoryMix: [] as { label: string; value: number }[],
          categoryCutoffs: [] as { label: string; value: number }[],
          cecCutoff: 0, frenchCutoff: 0, tieBreak: null as string | null,
          avgSize: '—', largest: '—', drawsYtd: 0,
        },
      };
    }

    const drawCat = drawCategoryFor(categoryCode);
    const catDraws = draws.filter((d) => d.category === drawCat);
    const series = (catDraws.length >= 3 ? catDraws : draws).slice(0, 12); // newest first
    const recentCutoffs = series.map((d) => d.cutoff_score);
    const trendCutoff = avg(recentCutoffs.slice(0, 6)) || score;

    const diff = score - trendCutoff;
    const oddsLabel = diff >= 10 ? 'High' : diff >= -10 ? 'Moderate' : 'Low';
    const gapText =
      diff >= 10
        ? t('analytics.clearTrend')
        : diff >= -10
          ? t('analytics.gapToHigh', { n: Math.ceil(10 - diff) })
          : t('analytics.gapToModerate', { n: Math.ceil(-10 - diff) });
    const timeframe =
      oddsLabel === 'High' ? t('analytics.timeframeHigh')
      : oddsLabel === 'Moderate' ? t('analytics.timeframeModerate')
      : t('analytics.timeframeLow');

    // Forecast — recent cutoffs (oldest→newest) + a naive "last value holds"
    // projection. The band width AND the confidence label are derived from the
    // ACTUAL volatility (std-dev) of recent cutoffs, not hardcoded.
    const actual = [...recentCutoffs.slice(0, 5)].reverse();
    const last = actual[actual.length - 1] ?? trendCutoff;
    const proj = [last, last, last];
    const fcMean = avg(actual);
    const fcSd = actual.length ? Math.sqrt(actual.reduce((s, v) => s + (v - fcMean) ** 2, 0) / actual.length) : 0;
    const fcHalf = Math.max(4, Math.round(fcSd));
    const band = proj.map((v, idx) => ({ lo: v - (idx + 1) * fcHalf, hi: v + (idx + 1) * fcHalf }));
    const fcConfidence = fcSd <= 5 ? 'High' : fcSd <= 12 ? 'Medium' : 'Low';
    const allC = [...actual, ...proj];
    const fMin = (allC.length ? Math.min(...allC) : 450) - 12;
    const fMax = (allC.length ? Math.max(...allC) : 550) + 12;

    const momentum: number[] = [];
    for (let k = 0; k < Math.min(6, series.length - 1); k++) momentum.push(series[k]!.cutoff_score - series[k + 1]!.cutoff_score);

    // Cadence between draw ROUNDS. IRCC frequently runs 2–3 category draws in the
    // same week (e.g. CEC, French and PNP on consecutive days), which would
    // collapse a naive day-to-day gap to ~1 day. Ignore sub-3-day gaps so the
    // cadence reflects the ~2-week spacing between rounds, not intra-week clusters.
    const uniqDates = [...new Set(draws.slice(0, 12).map((d) => d.date))].map((d) => parseISO(d).getTime()).sort((a, b) => b - a);
    const gaps: number[] = [];
    for (let k = 0; k < uniqDates.length - 1; k++) gaps.push(Math.round((uniqDates[k]! - uniqDates[k + 1]!) / DAY));
    const roundGaps = gaps.filter((g) => g >= 3);
    const avgGap = median(roundGaps.length ? roundGaps : gaps);
    const lastTime = uniqDates[0] ?? Date.now();
    const daysSinceLast = Math.max(0, Math.round((Date.now() - lastTime) / DAY));
    // Predicted next round = last draw + cadence. If that date has already passed
    // (IRCC is overdue), don't show a stale past date — surface "Any day now".
    const predictedTs = lastTime + avgGap * DAY;
    const nd = new Date(predictedTs);
    const nextDrawWindow = !avgGap
      ? '—'
      : predictedTs < Date.now()
        ? t('analytics.anyDayNow')
        : `~${mfmt(nd.getMonth())} ${nd.getDate()}`;

    // Next-draw likelihood — the most frequent categories in the recent rounds.
    const recentCatCount = new Map<string, number>();
    for (const d of draws.slice(0, 8)) recentCatCount.set(d.category, (recentCatCount.get(d.category) ?? 0) + 1);
    const topCats = [...recentCatCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([c]) => c);
    const nextDrawLikely = topCats.length ? topCats.join(t('analytics.or')) : '—';

    // YTD volume + prior-year total (live, dynamic years)
    const curYear = new Date(lastTime).getFullYear();
    const prevYear = curYear - 1;
    const ytd = draws.filter((d) => parseISO(d.date).getFullYear() === curYear);
    const itaYtd = ytd.reduce((s, d) => s + (d.invitations_issued || 0), 0);
    const itaPrevYear = draws
      .filter((d) => parseISO(d.date).getFullYear() === prevYear)
      .reduce((s, d) => s + (d.invitations_issued || 0), 0);
    const sizes = ytd.map((d) => d.invitations_issued).filter((n) => n > 0);

    // Projected full-year ITAs — extrapolate the YTD pace across the calendar year.
    const startOfYear = new Date(curYear, 0, 1).getTime();
    const endOfYear = new Date(curYear + 1, 0, 1).getTime();
    const yearFraction = clamp01((lastTime - startOfYear) / (endOfYear - startOfYear)) || 1;
    const itaProjected = yearFraction > 0.02 ? Math.round(itaYtd / yearFraction) : itaYtd;

    // Category mix (ITA share YTD)
    const byCat = new Map<string, number>();
    for (const d of ytd) byCat.set(d.category, (byCat.get(d.category) ?? 0) + (d.invitations_issued || 0));
    const totalItas = [...byCat.values()].reduce((s, v) => s + v, 0) || 1;
    const categoryMix = [...byCat.entries()]
      .map(([code, v]) => ({ label: label(code), value: Math.round((v / totalItas) * 100) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    // Latest cutoff per category
    const seen = new Set<string>();
    const categoryCutoffs: { label: string; value: number }[] = [];
    const latestByCat = new Map<string, number>();
    let cecCutoff = 0, frenchCutoff = 0;
    for (const d of draws) {
      if (seen.has(d.category)) continue;
      seen.add(d.category);
      categoryCutoffs.push({ label: label(d.category), value: d.cutoff_score });
      latestByCat.set(d.category, d.cutoff_score);
      if (d.category === 'CEC') cecCutoff = d.cutoff_score;
      if (d.category === 'French') frenchCutoff = d.cutoff_score;
    }
    categoryCutoffs.sort((a, b) => b.value - a.value);

    // Best stream for you — your CRS vs each stream's latest cutoff (live).
    const streamDefs: { label: string; cat: string }[] = [
      { label: t('analytics.streamPNP'), cat: 'PNP' },
      { label: t('analytics.streamFrench'), cat: 'French' },
      { label: t('analytics.streamCEC'), cat: 'CEC' },
      { label: t('analytics.streamFSW'), cat: 'General' },
    ];
    // Real margin (your CRS minus the stream's latest live cutoff), not a
    // fabricated "odds %". Positive = you'd have cleared that stream's last draw.
    const streams = streamDefs
      .map((sd) => {
        const cutoff = latestByCat.get(sd.cat);
        if (cutoff == null) return null;
        return { label: sd.label, cutoff, margin: score - cutoff };
      })
      .filter((x): x is { label: string; cutoff: number; margin: number } => x !== null)
      .sort((a, b) => b.margin - a.margin);

    // Months histogram — only the last ~12 months, so calendar-month buckets
    // aren't conflated across years (the old slice(0,60) spanned ~2 years of
    // draws and double-counted e.g. March 2025 + March 2026 into one bucket).
    const yearAgo = lastTime - 365 * DAY;
    const byMonth = new Array(12).fill(0) as number[];
    for (const d of draws) {
      const t = parseISO(d.date).getTime();
      if (Number.isNaN(t) || t < yearAgo) continue;
      const m = parseISO(d.date).getMonth();
      if (!Number.isNaN(m)) byMonth[m] += 1;
    }
    const activeMonths = byMonth.map((v, i) => ({ v, i })).filter((x) => x.v > 0);
    const busiestMonth = activeMonths.length ? mfmt(activeMonths.reduce((a, b) => (b.v > a.v ? b : a)).i) : '—';
    const quietestMonth = activeMonths.length ? mfmt(activeMonths.reduce((a, b) => (b.v < a.v ? b : a)).i) : '—';

    // Distribution of recent category cutoffs into 4 buckets, mark the user's.
    // Clamp: a score above the highest recent cutoff maps to the top bucket (and
    // below the lowest to the bottom one) so "Where you stand" always marks you —
    // otherwise an above-cutoff applicant gets no marker at all.
    const lo = Math.min(...recentCutoffs), hi = Math.max(...recentCutoffs);
    const span = Math.max(1, hi - lo);
    const edges = [lo, lo + span / 4, lo + span / 2, lo + (3 * span) / 4, hi + 0.001];
    const myBucket =
      score >= hi ? 3 : score < lo ? 0 : [0, 1, 2, 3].find((bi) => score >= edges[bi]! && score < edges[bi + 1]!) ?? 0;
    const distribution = [0, 1, 2, 3].map((bi) => {
      const from = Math.round(edges[bi]!), to = Math.round(edges[bi + 1]!);
      const count = recentCutoffs.filter((cv) => cv >= edges[bi]! && cv < edges[bi + 1]!).length;
      return { label: `${from}–${to}`, value: count, mine: bi === myBucket };
    });

    const beats = recentCutoffs.filter((cv) => score >= cv).length;
    const percentile = recentCutoffs.length ? Math.round((beats / recentCutoffs.length) * 100) : 0;

    // Expected wait by score band — derived from the live trend cutoff + cadence.
    const weeksSuffix = (n: number) =>
      avgGap ? t('analytics.weeksSuffix', { n: Math.max(1, Math.round((n * avgGap) / 7)) }) : '';
    const waitFor = (floor: number): string => {
      const margin = floor - trendCutoff;
      if (margin >= 0) return `${t('analytics.waitNextDraws')}${weeksSuffix(1.5)}`;
      if (margin >= -15) return `${t('analytics.wait1to3')}${weeksSuffix(2)}`;
      if (margin >= -30) return `${t('analytics.wait3to6')}${weeksSuffix(4)}`;
      return t('analytics.longWait');
    };
    const scoreBands = [
      { band: '525+', floor: 525 },
      { band: '510–524', floor: 510 },
      { band: '495–509', floor: 495 },
      { band: '< 495', floor: 0 },
    ];
    const byScoreBand = scoreBands.map((b) => {
      let mine = false;
      const range = b.band.match(/(\d+)\s*[–-]\s*(\d+)/);
      if (range) mine = score >= +range[1]! && score <= +range[2]!;
      else if (b.band.includes('+')) mine = score >= b.floor;
      else if (b.band.includes('<')) mine = score < 495;
      return { band: b.band, wait: waitFor(b.floor), mine };
    });

    // Trend series for line charts (oldest→newest)
    const lastN = (code: string, n: number) =>
      [...draws.filter((d) => d.category === code).slice(0, n)].reverse().map((d) => d.cutoff_score);
    const categoryTrends = {
      CEC: lastN('CEC', 8),
      French: lastN('French', 8),
      PNP: lastN('PNP', 8),
    };
    const invitationsTrend = [...draws.slice(0, 12)].reverse().map((d) => d.invitations_issued || 0);
    const allTrendVals = [
      ...categoryTrends.CEC, ...categoryTrends.French, ...categoryTrends.PNP, score,
    ].filter((v) => v > 0);
    const trendMin = allTrendVals.length ? Math.min(...allTrendVals) - 10 : 300;
    const trendMax = allTrendVals.length ? Math.max(...allTrendVals) + 10 : 700;

    // Tight axis for the single-series "cutoff vs your score" chart — scaled to
    // its OWN data (this category's cutoffs + your score), NOT the all-category
    // range, so a high PNP cutoff (~805) doesn't squash the CEC line to the floor.
    const selfTrendVals = [...recentCutoffs, score].filter((v) => v > 0);
    const selfTrendMin = selfTrendVals.length ? Math.min(...selfTrendVals) - 8 : 300;
    const selfTrendMax = selfTrendVals.length ? Math.max(...selfTrendVals) + 8 : 700;

    const momentumDown = momentum.length ? momentum.reduce((s, v) => s + v, 0) <= 0 : true;

    return {
      category: label(categoryCode),
      userScore: score,
      trendCutoff,
      oddsFraction: clamp01(0.5 + diff / 100),
      oddsLabel,
      timeframe,
      gapText,
      paths,
      forecast: { actual, proj, band, min: fMin, max: fMax, likely: `${last - fcHalf}–${last + fcHalf}`, confidence: fcConfidence },
      trend: [...recentCutoffs].reverse().slice(-9),
      categoryTrends,
      invitationsTrend,
      trendMin,
      trendMax,
      selfTrendMin,
      selfTrendMax,
      cadenceDays: avgGap,
      // Show round-to-round gaps (matches the ~Nd cadence label); fall back to
      // raw gaps only if every recent gap was an intra-week cluster.
      cadence: (roundGaps.length ? roundGaps : gaps).slice(0, 7).reverse(),
      busiestMonth,
      quietestMonth,
      momentumDown,
      byScoreBand,
      invitationsYtd: fmt(itaYtd),
      volume: sizes.slice(0, 6).reverse(),
      percentile,
      byMonth,
      distribution,
      momentum,
      streams,
      avgInvitations: fmt(avg(sizes)),
      ircc: {
        ...baseIrcc,
        curYear,
        prevYear,
        nextDrawWindow,
        nextDrawLikely,
        daysSinceLast,
        avgGap,
        typicalSize: fmt(avg(sizes)),
        itaYtd,
        itaProjected,
        itaPrevYear,
        categoryMix,
        categoryCutoffs,
        cecCutoff,
        frenchCutoff,
        tieBreak: draws[0]?.tie_breaking_rule ?? null,
        avgSize: fmt(avg(sizes)),
        largest: sizes.length ? fmt(Math.max(...sizes)) : '—',
        drawsYtd: ytd.length,
      },
    };
  }, [draws, profile, procTimes, eePool, t, i18n.language]);
}

export type AnalyticsData = ReturnType<typeof useAnalyticsData>;
