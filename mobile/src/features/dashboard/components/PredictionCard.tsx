import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/common/Card';
import { palette, spacing, typography } from '@/theme';
import type { Prediction } from '@/types';

type Props = { prediction: Prediction };

const strengthConfig = {
  strong:   { color: palette.success, emoji: '🚀', bg: palette.successLight },
  moderate: { color: palette.warning, emoji: '⚡', bg: palette.warningLight },
  weak:     { color: palette.danger,  emoji: '⏳', bg: palette.dangerLight  },
} as const;

export function PredictionCard({ prediction }: Props) {
  const config = strengthConfig[prediction.strength];

  return (
    <Card style={[styles.card, { backgroundColor: config.bg }]}>
      <View style={styles.header}>
        <Text style={styles.emoji}>{config.emoji}</Text>
        <View style={styles.headerText}>
          <Text style={styles.title}>Prediction</Text>
          <Text style={[styles.label, { color: config.color }]}>{prediction.label}</Text>
        </View>
      </View>

      <Text style={styles.description}>{prediction.description}</Text>

      {prediction.score_needed != null && prediction.score_needed > 0 && (
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Score needed:</Text>
          <Text style={[styles.statValue, { color: config.color }]}>+{prediction.score_needed}</Text>
        </View>
      )}

      {prediction.estimated_draws != null && (
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Estimated draws to wait:</Text>
          <Text style={[styles.statValue, { color: config.color }]}>{prediction.estimated_draws}</Text>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  emoji: { fontSize: 28 },
  headerText: { gap: 2 },
  title: { color: palette.textSecondary, fontSize: typography.xs, fontWeight: typography.medium },
  label: { fontSize: typography.lg, fontWeight: typography.bold },
  description: { color: palette.textSecondary, fontSize: typography.sm, lineHeight: 20 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statLabel: { color: palette.textMuted, fontSize: typography.sm },
  statValue: { fontSize: typography.base, fontWeight: typography.bold },
});
