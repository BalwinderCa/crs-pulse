import i18n from '@/i18n';

export function getScoreAccessibilityLabel(
  userScore: number,
  cutoff: number,
  category: string,
): string {
  const diff = userScore - cutoff;
  const direction = diff >= 0 ? i18n.t('cards.ptsAbove') : i18n.t('cards.ptsBelow');
  return i18n.t('cards.scoreCardAccessibility', {
    score: userScore,
    category,
    cutoff,
    diff: Math.abs(diff),
    direction,
  });
}

export function getPredictionAccessibilityLabel(
  label: string,
  description: string,
): string {
  return i18n.t('cards.predictionAccessibility', { label, description });
}
