import { useMemo } from 'react';
import { parseISO } from 'date-fns';
import { useDrawsStore } from '@/store/drawsStore';
import { downsample, MAX_CHART_POINTS } from '@/utils/downsample';
import type { Analytics, Category, ChartDataPoint } from '@/types';

type Params = { category?: Category | 'all'; period?: 'all' | '1y' | '6m' | '3m' };

function filterByPeriod<T extends { date: string }>(items: T[], period: string): T[] {
  if (period === 'all') return items;
  const cutoff = new Date();
  if (period === '3m') cutoff.setMonth(cutoff.getMonth() - 3);
  if (period === '6m') cutoff.setMonth(cutoff.getMonth() - 6);
  if (period === '1y') cutoff.setFullYear(cutoff.getFullYear() - 1);
  return items.filter(d => parseISO(d.date) >= cutoff);
}

export function useAnalytics({ category = 'all', period = 'all' }: Params = {}) {
  const { draws, isLoading, error, refresh } = useDrawsStore();

  const data = useMemo<Analytics | null>(() => {
    if (draws.length === 0) return null;

    let filtered = draws;
    if (category !== 'all') filtered = filtered.filter(d => d.category === category);
    filtered = filterByPeriod(filtered, period);

    if (filtered.length === 0) return null;

    const cutoffs  = filtered.map(d => d.cutoff_score);
    const avg      = Math.round(cutoffs.reduce((s, v) => s + v, 0) / cutoffs.length);
    const highest  = Math.max(...cutoffs);
    const lowest   = Math.min(...cutoffs);
    const totalInv = filtered.reduce((s, d) => s + d.invitations_issued, 0);

    // Trend: compare first half avg vs second half avg (draws sorted newest-first)
    const mid   = Math.floor(filtered.length / 2);
    const newer = filtered.slice(0, mid);
    const older = filtered.slice(mid);
    const newerAvg = newer.length ? newer.reduce((s, d) => s + d.cutoff_score, 0) / newer.length : avg;
    const olderAvg = older.length ? older.reduce((s, d) => s + d.cutoff_score, 0) / older.length : avg;
    const trendPct = olderAvg > 0 ? ((newerAvg - olderAvg) / olderAvg) * 100 : 0;
    const trend: Analytics['trend'] = Math.abs(trendPct) < 1 ? 'stable' : trendPct > 0 ? 'rising' : 'falling';

    // Chart data: oldest → newest, capped so large histories stay smooth/legible
    const chartData: ChartDataPoint[] = downsample(
      [...filtered]
        .reverse()
        .map(d => ({ date: d.date, cutoff: d.cutoff_score, invitations: d.invitations_issued })),
      MAX_CHART_POINTS,
    );

    return {
      category,
      average_cutoff: avg,
      highest_cutoff: highest,
      lowest_cutoff: lowest,
      total_draws: filtered.length,
      total_invitations: totalInv,
      trend,
      trend_percentage: Math.abs(parseFloat(trendPct.toFixed(1))),
      chart_data: chartData,
    };
  }, [draws, category, period]);

  return {
    data,
    isLoading: isLoading || (!data && !error),
    isError: !!error,
    error: error ? { message: error } : null,
    refetch: refresh,
  };
}
