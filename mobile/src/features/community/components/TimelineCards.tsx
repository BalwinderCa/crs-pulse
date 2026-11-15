import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { spacing, typography } from '@/theme';
import { useColors } from '@/hooks/useColors';
import { useAccentColor } from '@/hooks/useAccentColor';
import { MILESTONE_META } from '@/features/timeline/milestoneMeta';
import { PROGRAMS, STOPS, currentStep, reachedIndex, type ProgramId, type SharedTimeline } from '../model';

export function useProgramLabel() {
  const { t } = useTranslation();
  return (id: ProgramId) => PROGRAMS.find((p) => p.id === id)?.code || t('community.programOther');
}

/** One shared timeline as a plain list row: name and day, program and step, a thin progress bar. */
export function CommunityRow({ timeline, onPress }: { timeline: SharedTimeline; onPress?: () => void }) {
  const c = useColors();
  const accent = useAccentColor();
  const { t } = useTranslation();
  const programLabel = useProgramLabel();
  const now = currentStep(timeline);
  const pct = `${Math.round(((reachedIndex(timeline) + 1) / STOPS.length) * 100)}%` as const;
  return (
    <TouchableOpacity ph-label="community-row" activeOpacity={0.7} onPress={onPress} disabled={!onPress}
      style={[s.row, { borderBottomColor: c.border }]} accessibilityRole={onPress ? 'button' : undefined}>
      <View style={s.line1}>
        <Text style={[s.rowTitle, s.flex, { color: c.textPrimary }]} numberOfLines={1}>
          {timeline.alias || t('community.anonymous')}
        </Text>
        {now && <Text style={[s.day, { color: c.textPrimary }]}>{t('community.dayN', { n: now.day })}</Text>}
      </View>
      <Text style={[s.rowSub, { color: c.textMuted }]} numberOfLines={1}>
        {programLabel(timeline.program)}{now ? ` · ${t(MILESTONE_META[now.type].labelKey)}` : ''}
      </Text>
      <View style={[s.bar, { backgroundColor: c.border }]}>
        <View style={[s.barFill, { backgroundColor: accent, width: pct }]} />
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  row: { paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  line1: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.md },
  rowTitle: { fontSize: typography.base, fontWeight: typography.semibold },
  rowSub: { fontSize: typography.sm, marginTop: 3 },
  day: { fontSize: typography.base, fontWeight: typography.semibold, fontVariant: ['tabular-nums'] },
  bar: { height: 3, borderRadius: 2, marginTop: 10, overflow: 'hidden' },
  barFill: { height: 3, borderRadius: 2 },
});
