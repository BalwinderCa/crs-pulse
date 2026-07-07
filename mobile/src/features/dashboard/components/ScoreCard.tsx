import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { Badge } from '@/components/common/Badge';
import { palette, spacing, typography, borderRadius, shadows } from '@/theme';
import { useColors } from '@/hooks/useColors';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useTranslation } from 'react-i18next';
import type { Colors } from '@/theme/colors';
import { NEAR_THRESHOLD } from '@/constants';
import { getScoreAccessibilityLabel } from '@/utils/accessibility';

// Larger, more dramatic gauge
const GAUGE_SIZE = 140;
const CX = GAUGE_SIZE / 2;
const CY = GAUGE_SIZE / 2;
const RADIUS = 54;
const STROKE = 10;
const MAX_SCORE = 1200;
const ARC_START = 225;
const ARC_TOTAL = 270;

function toRad(deg: number) {
  return (deg - 90) * (Math.PI / 180);
}
function pt(deg: number) {
  return {
    x: CX + RADIUS * Math.cos(toRad(deg)),
    y: CY + RADIUS * Math.sin(toRad(deg)),
  };
}
function arcPath(startDeg: number, sweepDeg: number): string {
  if (sweepDeg <= 0) return '';
  const capped = Math.min(sweepDeg, 359.99);
  const endDeg = startDeg + capped;
  const s = pt(startDeg);
  const e = pt(endDeg);
  const large = capped > 180 ? 1 : 0;
  return `M ${s.x.toFixed(3)} ${s.y.toFixed(3)} A ${RADIUS} ${RADIUS} 0 ${large} 1 ${e.x.toFixed(3)} ${e.y.toFixed(3)}`;
}

type Props = {
  userScore: number;
  latestCutoff: number;
  category: string;
  drawNumber: number;
  drawDate: string;
};

function getScoreStatus(userScore: number, cutoff: number) {
  const diff = userScore - cutoff;
  if (diff >= 0)                        return { label: '✓  High Chance',  variant: 'success' as const };
  if (Math.abs(diff) <= NEAR_THRESHOLD) return { label: '⚡ Near Cutoff',  variant: 'warning' as const };
  return                                       { label: '↓  Below Cutoff', variant: 'danger'  as const };
}

function makeStyles(c: Colors) {
  return StyleSheet.create({
    container: {
      borderRadius: borderRadius['2xl'],
      overflow: 'hidden',
      backgroundColor: c.surfaceCard,
      borderWidth: 1,
      borderColor: c.border,
      ...shadows.md,
    },
    topStripe: {
      height: 3,
    },
    inner:    { padding: spacing.lg, gap: spacing.lg },
    mainRow:  { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
    gaugeWrap: {
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    gaugeCenter: {
      position: 'absolute',
      alignItems: 'center',
      justifyContent: 'center',
    },
    gaugeScore: {
      fontSize: typography['2xl'],
      fontWeight: typography.black,
      lineHeight: 28,
      textAlign: 'center',
    },
    gaugeMax: {
      fontSize: typography.xs,
      fontWeight: typography.medium,
      textAlign: 'center',
      marginTop: 1,
    },
    rightCol:    { flex: 1, gap: spacing.sm },
    scoreLabel:  { color: c.textSecondary, fontSize: typography.xs, fontWeight: typography.semibold, letterSpacing: 1.5, textTransform: 'uppercase' },
    score:       { fontSize: typography['6xl'], fontWeight: typography.black, lineHeight: 56, letterSpacing: -1 },
    statsRow:    { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.xs },
    statItem:    { gap: 2 },
    statLabel:   { color: c.textSecondary, fontSize: typography.xs, fontWeight: typography.medium },
    statValue:   { color: c.textPrimary, fontSize: typography.base, fontWeight: typography.bold },
    divider:     { height: 1, backgroundColor: c.border },
    bottomRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    bottomText:  { color: c.textSecondary, fontSize: typography.sm },
    diffText:    { fontSize: typography.sm, fontWeight: typography.bold },
  });
}

export function ScoreCard({ userScore, latestCutoff, category, drawNumber, drawDate }: Props) {
  const colors = useColors();
  const accent = useAccentColor();
  const { t } = useTranslation();
  const styles = makeStyles(colors);

  const diff    = userScore - latestCutoff;
  const status  = getScoreStatus(userScore, latestCutoff);
  const absDiff = Math.abs(diff);

  const fillSweep = Math.min(ARC_TOTAL, (userScore / MAX_SCORE) * ARC_TOTAL);
  const trackPath = arcPath(ARC_START, ARC_TOTAL);
  const fillPath  = arcPath(ARC_START, fillSweep);

  const statusColor = status.variant === 'success' ? palette.success
    : status.variant === 'warning' ? palette.warning : palette.danger;

  return (
    <View style={styles.container}>
      {/* Top color stripe */}
      <View style={[styles.topStripe, { backgroundColor: accent }]} />

      <View style={styles.inner}>
        <View
          style={styles.mainRow}
          accessible
          accessibilityRole="summary"
          accessibilityLabel={getScoreAccessibilityLabel(userScore, latestCutoff, category)}
        >
          {/* Gauge */}
          <View style={styles.gaugeWrap}>
            <Svg width={GAUGE_SIZE} height={GAUGE_SIZE}>
              <Defs>
                <LinearGradient id="arcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <Stop offset="0%" stopColor={accent} stopOpacity="0.6" />
                  <Stop offset="100%" stopColor={accent} stopOpacity="1" />
                </LinearGradient>
              </Defs>
              {/* Track */}
              <Path
                d={trackPath}
                fill="none"
                stroke={colors.border}
                strokeWidth={STROKE}
                strokeLinecap="round"
              />
              {/* Fill arc */}
              {fillPath ? (
                <Path
                  d={fillPath}
                  fill="none"
                  stroke={`url(#arcGrad)`}
                  strokeWidth={STROKE}
                  strokeLinecap="round"
                />
              ) : null}
            </Svg>
            <View style={styles.gaugeCenter}>
              <Text style={[styles.gaugeScore, { color: accent }]} maxFontSizeMultiplier={1.3}>{userScore}</Text>
              <Text style={[styles.gaugeMax, { color: colors.textMuted }]} maxFontSizeMultiplier={1.3}>/ 1200</Text>
            </View>
          </View>

          {/* Right column */}
          <View style={styles.rightCol}>
            <Text style={styles.scoreLabel}>{t('cards.crsScore')}</Text>
            <Text style={[styles.score, { color: accent }]} maxFontSizeMultiplier={1.3}>{userScore}</Text>
            <Badge label={status.label} variant={status.variant} />
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>{t('cards.cutoff')}</Text>
                <Text style={[styles.statValue, { color: statusColor }]}>{latestCutoff}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>{t('cards.draw')} #{drawNumber}</Text>
                <Text style={styles.statValue}>{drawDate}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.bottomRow}>
          <Text style={styles.bottomText}>
            {diff < 0 ? `${absDiff} pts from latest cutoff` : `${absDiff} pts above latest cutoff`}
          </Text>
          <Text style={[styles.diffText, { color: statusColor }]}>
            {diff >= 0 ? '+' : ''}{diff}
          </Text>
        </View>
      </View>
    </View>
  );
}
