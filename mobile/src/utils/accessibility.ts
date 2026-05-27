import { AccessibilityInfo, Platform } from 'react-native';

export async function announceForAccessibility(message: string): Promise<void> {
  AccessibilityInfo.announceForAccessibility(message);
}

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
  strength: 'strong' | 'moderate' | 'weak',
  label: string,
  description: string,
): string {
  return `Prediction: ${label}. ${description}`;
}
