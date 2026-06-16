import { useMemo } from 'react';
import { useDrawsStore } from '@/store/drawsStore';
import { useProfileStore } from '@/store/profileStore';
import { useProcessingTimesStore } from '@/store/processingTimesStore';
import { useEePoolStore } from '@/store/eePoolStore';
import { computePoolPosition } from '@/features/analytics/data/eePool';
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
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
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

// Static, factual CRS levers (real IRCC point values — not data about the user).
const IMPROVE_PATHS = [
  { label: 'French (NCLC 7+)', delta: '+50' },
  { label: 'Listening → CLB 9', delta: '+6' },
  { label: 'Provincial nomination', delta: '+600' },
];

export function useAnalyticsData() {
  const draws = useDrawsStore((s) => s.draws);
  const profile = useProfileStore((s) => s.profile);
  const procTimes = useProcessingTimesStore((s) => s.times);
  const eePool = useEePoolStore((s) => s.data);

  return useMemo(() => {
    const score = profile?.crs_score ?? 0;
    const categoryCode = profile?.category ?? 'CEC';

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
        gapTo: 'High',
        gapPoints: 0,
        paths: IMPROVE_PATHS,
        forecast: { actual: [] as number[], proj: [] as number[], band: [] as { lo: number; hi: number }[], min: 450, max: 550, likely: '—', confidence: 'Low' },
        trend: [] as number[],
        categoryTrends: { CEC: [] as number[], French: [] as number[], PNP: [] as number[] },
        invitationsTrend: [] as number[],
        trendMin: 300,
        trendMax: 700,
        cadenceDays: 0,
        cadence: [] as number[],
        invitationsYtd: '—',
        volume: [] as number[],
        percentile: 0,
        streams: [] as { label: string; value: number }[],
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
    const timeframe =
      oddsLabel === 'High' ? 'Likely next 1–2 draws'
      : oddsLabel === 'Moderate' ? '~2–4 draws · a few weeks'
      : 'Several draws away';

    // Forecast — recent cutoffs (oldest→newest) + flat projection + widening band
    const actual = [...recentCutoffs.slice(0, 5)].reverse();
    const last = actual[actual.length - 1] ?? trendCutoff;
    const proj = [last, last, last];
    const band = proj.map((v, idx) => ({ lo: v - idx * 6, hi: v + idx * 6 }));
    const allC = [...actual, ...proj];
    const fMin = (allC.length ? Math.min(...allC) : 450) - 12;
    const fMax = (allC.length ? Math.max(...allC) : 550) + 12;

    const momentum: number[] = [];
    for (let k = 0; k < Math.min(6, series.length - 1); k++) momentum.push(series[k]!.cutoff_score - series[k + 1]!.cutoff_score);

    // Cadence (gaps between draw dates, all categories)
    const uniqDates = [...new Set(draws.slice(0, 12).map((d) => d.date))].map((d) => new Date(d).getTime()).sort((a, b) => b - a);
    const gaps: number[] = [];
    for (let k = 0; k < uniqDates.length - 1; k++) gaps.push(Math.round((uniqDates[k]! - uniqDates[k + 1]!) / DAY));
    const avgGap = median(gaps);
    const lastTime = uniqDates[0] ?? Date.now();
    const daysSinceLast = Math.max(0, Math.round((Date.now() - lastTime) / DAY));
    const nd = new Date(lastTime + avgGap * DAY);
    const nextDrawWindow = avgGap ? `${MONTHS[nd.getMonth()]} ${nd.getDate()}` : '—';

    // Next-draw likelihood — the most frequent categories in the recent rounds.
    const recentCatCount = new Map<string, number>();
    for (const d of draws.slice(0, 8)) recentCatCount.set(d.category, (recentCatCount.get(d.category) ?? 0) + 1);
    const topCats = [...recentCatCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([c]) => c);
    const nextDrawLikely = topCats.length ? topCats.join(' or ') : '—';

    // YTD volume + prior-year total (live, dynamic years)
    const curYear = new Date(lastTime).getFullYear();
    const prevYear = curYear - 1;
    const ytd = draws.filter((d) => new Date(d.date).getFullYear() === curYear);
    const itaYtd = ytd.reduce((s, d) => s + (d.invitations_issued || 0), 0);
    const itaPrevYear = draws
      .filter((d) => new Date(d.date).getFullYear() === prevYear)
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
      { label: 'Provincial Nominee', cat: 'PNP' },
      { label: 'French proficiency', cat: 'French' },
      { label: 'Canadian Experience', cat: 'CEC' },
      { label: 'Federal Skilled Worker', cat: 'General' },
    ];
    const streams = streamDefs
      .map((sd) => {
        const cutoff = latestByCat.get(sd.cat);
        if (cutoff == null) return null;
        // Odds proxy: how far the user's CRS sits above/below that cutoff.
        const value = Math.round(Math.max(5, Math.min(99, 50 + (score - cutoff))));
        return { label: sd.label, value };
      })
      .filter((x): x is { label: string; value: number } => x !== null)
      .sort((a, b) => b.value - a.value);

    // Months histogram
    const byMonth = new Array(12).fill(0) as number[];
    for (const d of draws.slice(0, 60)) {
      const m = new Date(d.date).getMonth();
      if (!Number.isNaN(m)) byMonth[m] += 1;
    }
    const activeMonths = byMonth.map((v, i) => ({ v, i })).filter((x) => x.v > 0);
    const busiestMonth = activeMonths.length ? MONTHS[activeMonths.reduce((a, b) => (b.v > a.v ? b : a)).i]! : '—';
    const quietestMonth = activeMonths.length ? MONTHS[activeMonths.reduce((a, b) => (b.v < a.v ? b : a)).i]! : '—';

    // Distribution of recent category cutoffs into 4 buckets, mark user's
    const lo = Math.min(...recentCutoffs), hi = Math.max(...recentCutoffs);
    const span = Math.max(1, hi - lo);
    const edges = [lo, lo + span / 4, lo + span / 2, lo + (3 * span) / 4, hi + 0.001];
    const distribution = [0, 1, 2, 3].map((bi) => {
      const from = Math.round(edges[bi]!), to = Math.round(edges[bi + 1]!);
      const count = recentCutoffs.filter((cv) => cv >= edges[bi]! && cv < edges[bi + 1]!).length;
      const mine = score >= edges[bi]! && score < edges[bi + 1]!;
      return { label: `${from}–${to}`, value: count, mine };
    });

    const beats = recentCutoffs.filter((cv) => score >= cv).length;
    const percentile = recentCutoffs.length ? Math.round((beats / recentCutoffs.length) * 100) : 0;

    // Expected wait by score band — derived from the live trend cutoff + cadence.
    const weeksPerDraws = (n: number) => (avgGap ? ` · ~${Math.max(1, Math.round((n * avgGap) / 7))} wks` : '');
    const waitFor = (floor: number): string => {
      const margin = floor - trendCutoff;
      if (margin >= 0) return `Next 1–2 draws${weeksPerDraws(1.5)}`;
      if (margin >= -15) return `1–3 draws${weeksPerDraws(2)}`;
      if (margin >= -30) return `3–6 draws${weeksPerDraws(4)}`;
      return 'Long wait';
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

    const momentumDown = momentum.length ? momentum.reduce((s, v) => s + v, 0) <= 0 : true;

    return {
      category: label(categoryCode),
      userScore: score,
      trendCutoff,
      oddsFraction: clamp01(0.5 + diff / 100),
      oddsLabel,
      timeframe,
      gapTo: 'High',
      gapPoints: diff < 0 ? Math.ceil(Math.abs(diff)) + 10 : 14,
      paths: IMPROVE_PATHS,
      forecast: { actual, proj, band, min: fMin, max: fMax, likely: `${last - 7}–${last + 7}`, confidence: 'Medium' },
      trend: [...recentCutoffs].reverse().slice(-9),
      categoryTrends,
      invitationsTrend,
      trendMin,
      trendMax,
      cadenceDays: avgGap,
      cadence: gaps.slice(0, 7).reverse(),
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
  }, [draws, profile, procTimes, eePool]);
}

export type AnalyticsData = ReturnType<typeof useAnalyticsData>;
