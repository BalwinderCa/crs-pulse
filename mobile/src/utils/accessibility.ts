/**
 * Builders for screen-reader (VoiceOver / TalkBack) labels on the data-dense
 * score widgets. Grouping the numbers into one spoken sentence stops the reader
 * announcing the gauge, score and cutoff as disconnected fragments.
 */

export function getScoreAccessibilityLabel(
  userScore: number,
  cutoff: number,
  category: string,
): string {
  const diff = userScore - cutoff;
  const sign = diff >= 0 ? 'above' : 'below';
  return `Your CRS score is ${userScore}. The latest ${category} draw cutoff was ${cutoff}. You are ${Math.abs(diff)} points ${sign} the cutoff.`;
}

export function getPredictionAccessibilityLabel(
  label: string,
  description: string,
): string {
  return `Prediction: ${label}. ${description}`;
}
