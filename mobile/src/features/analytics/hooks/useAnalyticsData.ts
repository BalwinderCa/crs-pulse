import { useMemo } from 'react';
import { useDrawsStore } from '@/store/drawsStore';
import { useProfileStore } from '@/store/profileStore';
import { CATEGORY_LABELS } from '@/constants';

/**
 * Analytics view-model. Everything derivable from the live IRCC draws feed +
 * the user's profile is computed here; the rest (flpt processing backlog, the
 * annual Immigration Levels Plan targets, the EE pool-composition table) falls
 * back to DEFAULTS until those feeds are wired. Shape matches the screen so the
 * UI never knows whether a value is live or estimated.
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

// Not-yet-wired pieces (need flpt mirror / Levels Plan / pool table).
const DEFAULTS = {
  category: 'Canadian Experience Class',
  userScore: 0,
  trendCutoff: 0,
  oddsFraction: 0.5,
  oddsLabel: 'Moderate',
  timeframe: '—',
  gapTo: 'High',
  gapPoints: 0,
  paths: [
    { label: 'French (NCLC 7+)', delta: '+50' },
    { label: 'Listening → CLB 9', delta: '+6' },
    { label: 'Provincial nomination', delta: '+600' },
  ],
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
  streams: [
    { label: 'Provincial Nominee', value: 95 },
    { label: 'French proficiency', value: 81 },
    { label: 'Canadian Experience', value: 62 },
    { label: 'Federal Skilled Worker', value: 40 },
  ],
  byMonth: new Array(12).fill(0) as number[],
  distribution: [] as { label: string; value: number; mine?: boolean }[],
  byScoreBand: [
    { band: '525+', wait: 'Next 1–2 draws' },
    { band: '510–524', wait: '1–3 draws · ~6 wks' },
    { band: '495–509', wait: '3–6 draws · ~3 mo' },
    { band: '< 495', wait: 'Long wait' },
  ],
  momentum: [] as number[],
  avgInvitations: '—',
  ircc: {
    // estimated (no live source yet)
    peopleAhead: 11_800, myInventory: 60_900, estMonths: 7,
    itaProjected: 150_000, ita2025: 114_000, prTarget2026: 380_000,
    pnpTarget: 92_000, pnpTargetPrev: 55_000, pnpBacklog: 124_200,
    poolComposition: [
      { label: '601–1200', value: 4_500 },
      { label: '501–600', value: 68_000, mine: false },
      { label: '451–500', value: 72_000 },
      { label: '401–450', value: 90_000 },
      { label: '351–400', value: 60_000 },
      { label: '≤ 350', value: 31_000 },
    ],
    candidatesAtOrAbove: 72_500, poolTotal: 325_500,
    nextDrawLikely: 'CEC or French', typicalSize: '—',
    // live (overridden below)
    nextDrawWindow: '—', daysSinceLast: 0, avgGap: 0,
    itaYtd: 0, categoryMix: [] as { label: string; value: number }[],
    categoryCutoffs: [] as { label: string; value: number }[],
    cecCutoff: 0, frenchCutoff: 0, tieBreak: null as string | null,
    avgSize: '—', largest: '—', drawsYtd: 0,
  },
};

const drawCategoryFor = (cat: string) => (cat === 'FSW' ? 'General' : cat === 'FST' ? 'Trades' : cat);

export function useAnalyticsData() {
  const draws = useDrawsStore((s) => s.draws);
  const profile = useProfileStore((s) => s.profile);

  return useMemo(() => {
    if (draws.length === 0) return DEFAULTS;

    const score = profile?.crs_score ?? 0;
    const categoryCode = profile?.category ?? 'CEC';
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

    // YTD volume
    const year = new Date(lastTime).getFullYear();
    const ytd = draws.filter((d) => new Date(d.date).getFullYear() === year);
    const itaYtd = ytd.reduce((s, d) => s + (d.invitations_issued || 0), 0);
    const sizes = ytd.map((d) => d.invitations_issued).filter((n) => n > 0);

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
    let cecCutoff = 0, frenchCutoff = 0;
    for (const d of draws) {
      if (seen.has(d.category)) continue;
      seen.add(d.category);
      categoryCutoffs.push({ label: label(d.category), value: d.cutoff_score });
      if (d.category === 'CEC') cecCutoff = d.cutoff_score;
      if (d.category === 'French') frenchCutoff = d.cutoff_score;
    }
    categoryCutoffs.sort((a, b) => b.value - a.value);

    // Months histogram
    const byMonth = new Array(12).fill(0) as number[];
    for (const d of draws.slice(0, 60)) {
      const m = new Date(d.date).getMonth();
      if (!Number.isNaN(m)) byMonth[m] += 1;
    }
    // Busiest / quietest month (only over months that actually had draws)
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

    // Trend series for line charts (oldest→newest)
    const lastN = (code: string, n: number) =>
      [...draws.filter((d) => d.category === code).slice(0, n)].reverse().map((d) => d.cutoff_score);
    const categoryTrends = {
      CEC: lastN('CEC', 8),
      French: lastN('French', 8),
      PNP: lastN('PNP', 8),
    };
    const invitationsTrend = [...draws.slice(0, 12)].reverse().map((d) => d.invitations_issued || 0);
    // Bounds covering all category-trend series + user score
    const allTrendVals = [
      ...categoryTrends.CEC, ...categoryTrends.French, ...categoryTrends.PNP, score,
    ].filter((v) => v > 0);
    const trendMin = allTrendVals.length ? Math.min(...allTrendVals) - 10 : 300;
    const trendMax = allTrendVals.length ? Math.max(...allTrendVals) + 10 : 700;

    // Momentum direction — falling cutoffs (sum of recent deltas ≤ 0) help the user
    const momentumDown = momentum.length ? momentum.reduce((s, v) => s + v, 0) <= 0 : true;

    // Mark which score band the user falls into (parses the static band labels)
    const bandHasScore = (band: string) => {
      const range = band.match(/(\d+)\s*[–-]\s*(\d+)/);
      if (range) return score >= +range[1]! && score <= +range[2]!;
      if (band.includes('+')) { const n = band.match(/(\d+)/); return n ? score >= +n[1]! : false; }
      if (band.includes('<')) { const n = band.match(/(\d+)/); return n ? score < +n[1]! : false; }
      return false;
    };
    const byScoreBand = DEFAULTS.byScoreBand.map((r) => ({ ...r, mine: bandHasScore(r.band) }));

    const pool = DEFAULTS.ircc.poolComposition.map((p) => ({
      ...p,
      mine: (() => {
        const m = p.label.match(/(\d+)[–-](\d+)/);
        if (!m) return p.label.includes('601') ? score >= 601 : score <= 350;
        return score >= +m[1]! && score <= +m[2]!;
      })(),
    }));

    return {
      ...DEFAULTS,
      category: label(categoryCode),
      userScore: score,
      trendCutoff,
      oddsFraction: clamp01(0.5 + diff / 100),
      oddsLabel,
      timeframe,
      gapPoints: diff < 0 ? Math.ceil(Math.abs(diff)) + 10 : 14,
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
      avgInvitations: fmt(avg(sizes)),
      ircc: {
        ...DEFAULTS.ircc,
        poolComposition: pool,
        nextDrawWindow,
        daysSinceLast,
        avgGap,
        typicalSize: fmt(avg(sizes)),
        itaYtd,
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
  }, [draws, profile]);
}

export type AnalyticsData = ReturnType<typeof useAnalyticsData>;
