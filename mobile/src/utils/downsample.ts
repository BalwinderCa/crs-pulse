/**
 * Uniformly downsamples a series to at most `maxPoints`, always preserving the
 * first and last elements so the trend's start and end stay accurate.
 *
 * Used to bound how many points reach the chart: rendering hundreds of draws
 * (every IRCC round since 2015) produced a slow, unreadable line with a dot per
 * point. ~60 points keeps the shape while staying smooth.
 */
export function downsample<T>(items: readonly T[], maxPoints: number): T[] {
  if (maxPoints <= 0) return [];
  if (items.length <= maxPoints) return [...items];
  if (maxPoints === 1) return [items[items.length - 1]!];

  const result: T[] = [];
  const step = (items.length - 1) / (maxPoints - 1);
  for (let i = 0; i < maxPoints; i++) {
    result.push(items[Math.round(i * step)]!);
  }
  return result;
}

/** Default cap for the analytics trend chart. */
export const MAX_CHART_POINTS = 60;
