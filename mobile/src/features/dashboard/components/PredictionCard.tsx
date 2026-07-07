import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/common/Card';
import { palette, spacing, typography, borderRadius } from '@/theme';
import { useColors } from '@/hooks/useColors';
import { useTranslation } from 'react-i18next';
import type { Colors } from '@/theme/colors';
import type { Prediction } from '@/types';
import { getPredictionAccessibilityLabel } from '@/utils/accessibility';

type Props = { prediction: Prediction };

const strengthConfig = {
  strong:   { color: palette.success, emoji: '🚀', bg: palette.successLight, border: palette.success + '25' },
  moderate: { color: palette.warning, emoji: '⚡', bg: palette.warningLight, border: palette.warning + '25' },
  weak:     { color: palette.danger,  emoji: '⏳', bg: palette.dangerLight,  border: palette.danger  + '25' },
} as const;

function makeStyles(c: Colors) {
  return StyleSheet.create({
    card:        { gap: spacing.md, borderWidth: 1 },
    header:      { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    emojiWrap:   { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.1)' },
    emoji:       { fontSize: 22 },
    headerText:  { gap: 2, flex: 1 },
    predLabel:   { color: c.textMuted, fontSize: typography.xs, fontWeight: typography.semibold, letterSpacing: 0.5, textTransform: 'uppercase' },
    label:       { fontSize: typography.lg, fontWeight: typography.black },
    description: { color: c.textSecondary, fontSize: typography.sm, lineHeight: 20 },
    statRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: borderRadius.md, padding: spacing.sm + 2 },
    statLabel:   { color: c.textSecondary, fontSize: typography.sm },
    statValue:   { fontSize: typography.base, fontWeight: typography.black },
  });
}

export function PredictionCard({ prediction }: Props) {
  const colors = useColors();
  const { t } = useTranslation();
  const styles = makeStyles(colors);
  const config = strengthConfig[prediction.strength];

  return (
    <Card
      style={[styles.card, { backgroundColor: config.bg, borderColor: config.border }]}
      accessible
      accessibilityRole="summary"
      accessibilityLabel={getPredictionAccessibilityLabel(prediction.label, prediction.description)}
    >
      <View style={styles.header}>
        <View style={styles.emojiWrap}>
          <Text style={styles.emoji}>{config.emoji}</Text>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.predLabel}>{t('cards.prediction')}</Text>
          <Text style={[styles.label, { color: config.color }]}>{prediction.label}</Text>
        </View>
      </View>
      <Text style={styles.description}>{prediction.description}</Text>
      {prediction.score_needed != null && prediction.score_needed > 0 && (
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>{t('cards.scoreNeeded')}</Text>
          <Text style={[styles.statValue, { color: config.color }]}>+{prediction.score_needed}</Text>
        </View>
      )}
      {prediction.estimated_draws != null && (
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>{t('cards.estimatedDraws')}</Text>
          <Text style={[styles.statValue, { color: config.color }]}>{prediction.estimated_draws}</Text>
        </View>
      )}
    </Card>
  );
}
