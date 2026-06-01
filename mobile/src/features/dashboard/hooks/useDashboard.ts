import { useMemo } from 'react';
import { useDrawsStore } from '@/store/drawsStore';
import { useProfileStore } from '@/store/profileStore';
import type { DashboardData, Prediction } from '@/types';
import { NEAR_THRESHOLD } from '@/constants';

function buildPrediction(userScore: number, recentDraws: DashboardData['recent_draws']): Prediction {
  if (recentDraws.length === 0) {
    return { strength: 'weak', label: 'No Data', description: 'No recent draw data available.', score_needed: null, estimated_draws: null };
  }
  const avgCutoff = recentDraws.reduce((s, d) => s + d.cutoff_score, 0) / recentDraws.length;
  const diff = userScore - avgCutoff;

  if (diff >= NEAR_THRESHOLD) {
    return {
      strength: 'strong',
      label: 'High Chance',
      description: 'Your score is well above the recent average. Expect an invitation soon.',
      score_needed: null,
      estimated_draws: null,
    };
  }
  if (diff >= -NEAR_THRESHOLD) {
    return {
      strength: 'moderate',
      label: 'Moderate Chance',
      description: 'Your score is near the recent cutoff. You may receive an invitation in the next few rounds.',
      score_needed: diff < 0 ? Math.ceil(Math.abs(diff)) : null,
      estimated_draws: null,
    };
  }
  return {
    strength: 'weak',
    label: 'Long Wait',
    description: 'Your score is below recent cutoffs. Consider improving your profile.',
    score_needed: Math.ceil(Math.abs(diff)),
    estimated_draws: null,
  };
}

export function useDashboard() {
  const { draws, isLoading, isRefreshing, error } = useDrawsStore();
  const profile = useProfileStore((s) => s.profile);

  const data = useMemo<DashboardData | null>(() => {
    if (!profile || draws.length === 0) return null;

    const userScore    = profile.crs_score;
    const userCategory = profile.category;

    // Latest draw matching user category (or any if none)
    // draws.length > 0 is guaranteed above, so draws[0] is always defined
    const categoryDraws = draws.filter(d => d.category === userCategory);
    const latestDraw    = (categoryDraws[0] ?? draws[0])!;
    const recentDraws   = draws.slice(0, 10);

    const scoreDiff = userScore - latestDraw.cutoff_score;
    const prediction = buildPrediction(userScore, recentDraws);

    return {
      user_score:       userScore,
      user_category:    userCategory,
      latest_draw:      latestDraw,
      score_difference: scoreDiff,
      prediction,
      recent_draws:     recentDraws.slice(0, 5),
    };
  }, [draws, profile]);

  return {
    data,
    isLoading: isLoading || profile === null,
    isRefetching: isRefreshing,
    isError: !!error,
    error: error ? { message: error } : null,
    refetch: useDrawsStore.getState().refresh,
  };
}
