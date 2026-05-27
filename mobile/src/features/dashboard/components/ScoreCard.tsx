import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'react-native-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { palette, spacing, typography, borderRadius } from '@/theme';
import { NEAR_THRESHOLD } from '@/constants';

type Props = {
  userScore: number;
  latestCutoff: number;
  category: string;
  drawNumber: number;
  drawDate: string;
};

function getScoreStatus(userScore: number, cutoff: number) {
  const diff = userScore - cutoff;
  if (diff >= 0) return { label: 'High Chance', variant: 'success' as const, icon: 'trending-up' as const };
  if (Math.abs(diff) <= NEAR_THRESHOLD) return { label: 'Near Cutoff', variant: 'warning' as const, icon: 'remove' as const };
  return { label: 'Below Cutoff', variant: 'danger' as const, icon: 'trending-down' as const };
}

export function ScoreCard({ userScore, latestCutoff, category, drawNumber, drawDate }: Props) {
  const diff   = userScore - latestCutoff;
  const status = getScoreStatus(userScore, latestCutoff);
  const sign   = diff >= 0 ? '+' : '';

  return (
    <Card padding={0} style={styles.card}>
      <LinearGradient
        colors={['#112040', '#0D1F3C']}
        style={styles.gradient}
      >
        {/* Top row */}
        <View style={styles.topRow}>
          <View>
            <Text style={styles.scoreLabel}>Your CRS Score</Text>
            <Text style={styles.score}>{userScore}</Text>
          </View>
          <Badge label={status.label} variant={status.variant} />
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Bottom row */}
        <View style={styles.bottomRow}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Latest Draw #{drawNumber}</Text>
            <Text style={styles.statValue}>{latestCutoff}</Text>
            <Text style={styles.statSub}>{drawDate}</Text>
          </View>

          <View style={styles.stat}>
            <Text style={styles.statLabel}>Difference</Text>
            <View style={styles.diffRow}>
              <Ionicons
                name={status.icon}
                size={18}
                color={diff >= 0 ? palette.success : diff > -NEAR_THRESHOLD ? palette.warning : palette.danger}
              />
              <Text style={[
                styles.diffValue,
                { color: diff >= 0 ? palette.success : diff > -NEAR_THRESHOLD ? palette.warning : palette.danger }
              ]}>
                {sign}{diff}
              </Text>
            </View>
            <Text style={styles.statSub}>{category}</Text>
          </View>
        </View>
      </LinearGradient>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden' },
  gradient: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    gap: spacing.base,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  scoreLabel: { color: palette.textSecondary, fontSize: typography.sm },
  score: {
    color: palette.white,
    fontSize: typography['5xl'],
    fontWeight: typography.extrabold,
    lineHeight: 56,
  },
  divider: { height: 1, backgroundColor: palette.surfaceTertiary },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stat: { gap: 4 },
  statLabel: { color: palette.textSecondary, fontSize: typography.xs },
  statValue: {
    color: palette.white,
    fontSize: typography['2xl'],
    fontWeight: typography.bold,
  },
  statSub: { color: palette.gray400, fontSize: typography.xs },
  diffRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  diffValue: { fontSize: typography.xl, fontWeight: typography.bold },
});
