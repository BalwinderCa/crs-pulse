import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { format } from 'date-fns';
import { Badge } from '@/components/common/Badge';
import { Card } from '@/components/common/Card';
import { palette, spacing, typography } from '@/theme';
import { useColors } from '@/hooks/useColors';
import type { Colors } from '@/theme/colors';
import type { Draw } from '@/types';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const CATEGORY_BADGE: Record<string, BadgeVariant> = {
  CEC: 'success', General: 'neutral', Healthcare: 'info', STEM: 'info', Trades: 'warning', French: 'danger',
};

type Props = { draw: Draw; userScore?: number };

function makeStyles(c: Colors) {
  return StyleSheet.create({
    card:       { gap: spacing.sm },
    headerRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    numberWrap: { gap: 0 },
    drawLabel:  { color: c.textMuted,    fontSize: typography.xs },
    drawNumber: { color: c.textPrimary,  fontSize: typography.lg, fontWeight: typography.bold },
    date:       { color: c.textSecondary,fontSize: typography.sm },
    statsRow:   { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs },
    stat:       { gap: 2 },
    statLabel:  { color: c.textMuted, fontSize: typography.xs },
    statValue:  { color: c.textPrimary, fontSize: typography.md, fontWeight: typography.medium },
    cutoff:     { color: palette.blue, fontSize: typography.xl, fontWeight: typography.bold },
    diffValue:  { fontSize: typography.md, fontWeight: typography.bold },
    tieBraking: { color: c.textMuted, fontSize: typography.xs },
  });
}

export function DrawCard({ draw, userScore }: Props) {
  const colors = useColors();
  const styles = makeStyles(colors);
  const diff = userScore != null ? userScore - draw.cutoff_score : null;

  return (
    <Card variant="outlined" style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.numberWrap}>
          <Text style={styles.drawLabel}>Draw</Text>
          <Text style={styles.drawNumber}>#{draw.draw_number}</Text>
        </View>
        <Badge label={draw.category} variant={CATEGORY_BADGE[draw.category] ?? 'neutral'} />
      </View>

      <Text style={styles.date}>{format(new Date(draw.date), 'MMMM d, yyyy')}</Text>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Cutoff</Text>
          <Text style={styles.cutoff}>{draw.cutoff_score}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Invitations</Text>
          <Text style={styles.statValue}>{draw.invitations_issued.toLocaleString()}</Text>
        </View>
        {diff !== null && (
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Your Gap</Text>
            <Text style={[styles.diffValue, { color: diff >= 0 ? palette.success : diff >= -10 ? palette.warning : palette.danger }]}>
              {diff >= 0 ? '+' : ''}{diff}
            </Text>
          </View>
        )}
      </View>

      {draw.tie_breaking_rule && (
        <Text style={styles.tieBraking} numberOfLines={1}>Tie-break: {draw.tie_breaking_rule}</Text>
      )}
    </Card>
  );
}
