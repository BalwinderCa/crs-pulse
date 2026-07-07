import React, { useMemo } from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { useTranslation } from 'react-i18next';

// Official IRCC "Express Entry rounds of invitations" page. Appending ?q=<draw
// number> opens that specific round (e.g. ...invitations.html?q=418).
const IRCC_ROUNDS_URL =
  'https://www.canada.ca/en/immigration-refugees-citizenship/corporate/mandate/policies-operational-instructions-agreements/ministerial-instructions/express-entry-rounds/invitations.html';
import { Badge } from '@/components/common/Badge';
import { palette, spacing, typography, borderRadius } from '@/theme';
import { useColors } from '@/hooks/useColors';
import { useAccentColor } from '@/hooks/useAccentColor';
import type { Colors } from '@/theme/colors';
import type { Draw } from '@/types';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const CATEGORY_BADGE: Record<string, BadgeVariant> = {
  CEC: 'success', General: 'neutral', Healthcare: 'info', STEM: 'info', Trades: 'warning', French: 'danger',
};

const CATEGORY_COLOR: Record<string, string> = {
  CEC: palette.success,
  General: palette.gray300,
  Healthcare: palette.blue,
  STEM: palette.blueLight,
  Trades: palette.warning,
  French: palette.danger,
};

type Props = { draw: Draw; userScore?: number };

function makeStyles(c: Colors, _accentColor: string) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      backgroundColor: c.surfaceCard,
      borderRadius: borderRadius.md,
      borderWidth: 0.3,
      borderColor: c.border,
      overflow: 'hidden',
    },
    leftBorder: { width: 3 },
    inner:       { flex: 1, padding: spacing.base, gap: spacing.md },
    headerRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    numberWrap:  { gap: 1 },
    drawLabel:   { color: c.textMuted, fontSize: typography.xs, fontWeight: typography.semibold, letterSpacing: 1, textTransform: 'uppercase' },
    drawNumber:  { color: c.textPrimary, fontSize: typography.xl, fontWeight: typography.black },
    date:        { color: c.textSecondary, fontSize: typography.sm },
    statsRow:    { flexDirection: 'row', gap: spacing.xl },
    stat:        { gap: 3 },
    statLabel:   { color: c.textMuted, fontSize: typography.xs, fontWeight: typography.medium, textTransform: 'uppercase', letterSpacing: 0.5 },
    statValue:   { color: c.textPrimary, fontSize: typography.lg, fontWeight: typography.bold },
    cutoff:      { fontSize: typography['2xl'], fontWeight: typography.black, letterSpacing: -0.5 },
    diffPositive:{ color: palette.success },
    diffNegNear: { color: palette.warning },
    diffNegFar:  { color: palette.danger },
    tieBraking:  { color: c.textMuted, fontSize: typography.xs },
    arrow:       { color: c.textMuted },
  });
}

export function DrawCard({ draw, userScore }: Props) {
  const colors = useColors();
  const accent = useAccentColor();
  const { t } = useTranslation();
  const borderColor = CATEGORY_COLOR[draw.category] ?? accent;
  const styles = makeStyles(colors, accent);
  const diff = userScore != null ? userScore - draw.cutoff_score : null;
  const formattedDate = useMemo(() => format(parseISO(draw.date.slice(0, 10)), 'MMMM d yyyy'), [draw.date]);

  return (
    <TouchableOpacity
      onPress={() => Linking.openURL(`${IRCC_ROUNDS_URL}?q=${draw.draw_number}`)}
      activeOpacity={0.7}
      accessible={true}
      accessibilityRole="link"
       accessibilityLabel={t('cards.drawAccessibility', {
          number: draw.draw_number,
          category: draw.category,
          cutoff: draw.cutoff_score,
          date: formattedDate,
          invitations: draw.invitations_issued.toLocaleString(),
        })}
    >
      <View style={styles.card}>
        {/* Colored left border by category */}
        <View style={[styles.leftBorder, { backgroundColor: borderColor }]} />

        <View style={styles.inner}>
          <View style={styles.headerRow}>
            <View style={styles.numberWrap}>
              <Text style={styles.drawLabel}>{t('cards.draw')}</Text>
              <Text style={styles.drawNumber}>#{draw.draw_number}</Text>
            </View>
            <View style={styles.headerRight}>
              <Badge label={draw.category} variant={CATEGORY_BADGE[draw.category] ?? 'neutral'} />
              <Ionicons name="open-outline" size={14} style={styles.arrow} />
            </View>
          </View>

          <Text style={styles.date}>{format(parseISO(draw.date.slice(0, 10)), 'MMMM d, yyyy')}</Text>

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>{t('cards.cutoff')}</Text>
              <Text style={[styles.statValue, styles.cutoff, { color: accent }]}>{draw.cutoff_score}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>{t('cards.invitations')}</Text>
              <Text style={styles.statValue}>{draw.invitations_issued.toLocaleString()}</Text>
            </View>
            {diff !== null && (
              <View style={styles.stat}>
                <Text style={styles.statLabel}>{t('cards.yourGap')}</Text>
                <Text style={[
                  styles.statValue,
                  diff >= 0 ? styles.diffPositive : diff >= -10 ? styles.diffNegNear : styles.diffNegFar
                ]}>
                  {diff >= 0 ? '+' : ''}{diff}
                </Text>
              </View>
            )}
          </View>

          {draw.tie_breaking_rule && (
            <Text style={styles.tieBraking} numberOfLines={1}>{t('cards.tieBreak', { rule: draw.tie_breaking_rule })}</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}
