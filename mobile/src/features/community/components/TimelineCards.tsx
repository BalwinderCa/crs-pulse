import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from '@/components/common/AppText';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { enUS, fr } from 'date-fns/locale';
import { spacing, typography, borderRadius } from '@/theme';
import { useColors, useResolvedScheme } from '@/hooks/useColors';
import { useAccentColor } from '@/hooks/useAccentColor';
import { MILESTONE_META } from '@/features/timeline/milestoneMeta';
import { MilestoneIcon } from '@/features/timeline/components/MilestoneIcon';
import type { MilestoneType } from '@/store/timelineStore';
import { BuddyAvatar, isBuddyId } from './BuddyAvatar';
import { PROGRAMS, STOPS, currentStep, reachedIndex, stopOf, type ProgramId, type SharedTimeline } from '../model';

export function useProgramLabel() {
  const { t } = useTranslation();
  return (id: ProgramId) => PROGRAMS.find((p) => p.id === id)?.code || t('community.programOther');
}

export type Tone = { tint: string; ink: string };
type ToneKey = 'start' | 'checks' | 'passport' | 'decision';

// Stage colours for pills, tiles and step icons. Light mode pairs a pale tint
// with a dark ink; dark mode a translucent tint with a light ink. Every pair
// keeps text at 4.5:1 or better.
const TONES: Record<'light' | 'dark', Record<ToneKey, Tone>> = {
  light: {
    start:    { tint: '#DBEAFE', ink: '#1E40AF' },
    checks:   { tint: '#DCFCE7', ink: '#166534' },
    passport: { tint: '#FEF3C7', ink: '#92400E' },
    decision: { tint: '#FEE2E2', ink: '#991B1B' },
  },
  dark: {
    start:    { tint: '#3B82F633', ink: '#93C5FD' },
    checks:   { tint: '#22C55E2E', ink: '#86EFAC' },
    passport: { tint: '#F59E0B2E', ink: '#FCD34D' },
    decision: { tint: '#EF44442E', ink: '#FCA5A5' },
  },
};

/** The tone for a milestone type: start (ITA → AOR), checks, passport, decision. */
export function useStageTone() {
  const scheme = useResolvedScheme();
  const set = TONES[scheme === 'dark' ? 'dark' : 'light'];
  return (type: MilestoneType): Tone => {
    const stop = stopOf(type);
    if (stop === 'bio' || stop === 'medical') return set.checks;
    if (stop === 'ppr') return set.passport;
    if (stop === 'decision') return set.decision;
    return set.start;
  };
}

export function Avatar({ alias, avatar, size = 42 }: { alias: string; avatar?: string | undefined; size?: number }) {
  const accent = useAccentColor();
  const { t } = useTranslation();
  if (isBuddyId(avatar)) return <BuddyAvatar id={avatar} size={size} />;
  const anon = !alias || alias === t('community.anonymous');
  return (
    <View style={[s.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: accent + '1F' }]}>
      {anon
        ? <Ionicons name="person" size={size * 0.5} color={accent} />
        : <Text style={[s.avatarTxt, { color: accent, fontSize: size * 0.4 }]}>{alias.trim()[0]!.toUpperCase()}</Text>}
    </View>
  );
}

/**
 * One shared timeline as a card: who it is, how many stages they have reached, and
 * their last three steps (newest first) with the days each one took to arrive.
 */
export function PersonCard({ timeline, onPress }: { timeline: SharedTimeline; onPress?: () => void }) {
  const c = useColors();
  const { t, i18n } = useTranslation();
  const programLabel = useProgramLabel();
  const tone = useStageTone();
  const now = currentStep(timeline);
  const alias = timeline.alias || t('community.anonymous');
  const aor = timeline.aorMonth
    ? t('community.aorIn', { month: format(parseISO(`${timeline.aorMonth}-01`), 'MMM yyyy', { locale: i18n.language?.startsWith('fr') ? fr : enUS }) })
    : null;
  const meta = [programLabel(timeline.program), aor].filter(Boolean).join(' · ');
  const stages = reachedIndex(timeline) + 1;
  const recent = timeline.steps
    .map((step, i) => ({ ...step, gap: i > 0 ? step.day - timeline.steps[i - 1]!.day : null }))
    .slice(-3).reverse();
  const label = [alias, meta, stages > 0 ? t('community.stageOf', { n: stages, total: STOPS.length }) : '',
    ...recent.map((step) => `${t(MILESTONE_META[step.type].labelKey)} ${t('community.dayN', { n: step.day })}`)]
    .filter(Boolean).join(', ');

  return (
    <TouchableOpacity ph-label="community-row" activeOpacity={0.8} onPress={onPress} disabled={!onPress}
      style={[s.card, { backgroundColor: c.surfaceCard }]} accessibilityRole={onPress ? 'button' : undefined}
      accessible accessibilityLabel={label} accessibilityHint={onPress ? t('community.openTimelineHint') : undefined}>
      <View style={s.row}>
        <Avatar alias={alias} avatar={timeline.avatar} size={40} />
        <View style={s.mid}>
          <Text style={[s.name, { color: c.textPrimary }]} numberOfLines={1}>{alias}</Text>
          <Text style={[s.meta, { color: c.textMuted }]} numberOfLines={1}>{meta}</Text>
        </View>
        {now && stages > 0 && (
          <View style={[s.pill, { backgroundColor: tone(now.type).tint }]}>
            <Text style={[s.stages, { color: tone(now.type).ink }]}>{stages}/{STOPS.length}</Text>
          </View>
        )}
      </View>
      <View>
        {recent.map((step, i) => {
          const stepMeta = MILESTONE_META[step.type];
          const st = tone(step.type);
          const ink = i === 0 ? c.textPrimary : c.textMuted;
          return (
            <View key={`${step.type}-${step.day}-${i}`} style={s.step}>
              {i < recent.length - 1 && <View style={[s.thread, { backgroundColor: c.border }]} />}
              <View style={[s.stepIcon, { backgroundColor: st.tint }]}>
                <MilestoneIcon meta={stepMeta} size={13} color={st.ink} />
              </View>
              <Text style={[s.stepLabel, { color: ink }, i === 0 && s.bold]} numberOfLines={1}>{t(stepMeta.labelKey)}</Text>
              {!!step.gap && (
                <View style={[s.pill, { backgroundColor: c.surfacePrimary }]}>
                  <Text style={[s.meta, { color: c.textSecondary }]}>{t('community.gapDays', { n: step.gap })}</Text>
                </View>
              )}
              <Text style={[s.day, { color: ink }]}>{t('community.dayN', { n: step.day })}</Text>
            </View>
          );
        })}
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  avatar: { alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { fontWeight: typography.bold },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  card: { borderRadius: borderRadius.lg, padding: 14, gap: spacing.md,
          shadowColor: '#0F172A', shadowOpacity: 0.05, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  mid: { flex: 1, minWidth: 0 },
  name: { fontSize: typography.base, fontWeight: typography.semibold },
  meta: { fontSize: typography.xs, fontWeight: typography.medium },
  pill: { borderRadius: borderRadius.full, paddingHorizontal: 8, paddingVertical: 2 },
  stages: { fontSize: typography.sm, fontWeight: typography.bold, fontVariant: ['tabular-nums'] },
  step: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 4 },
  thread: { position: 'absolute', left: 11, top: 26, height: 12, width: 2 },
  stepIcon: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  stepLabel: { flex: 1, fontSize: typography.sm, fontWeight: typography.medium },
  bold: { fontWeight: typography.bold },
  day: { fontSize: typography.xs, fontWeight: typography.medium, minWidth: 54, textAlign: 'right', fontVariant: ['tabular-nums'] },
});
