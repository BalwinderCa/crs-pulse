import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, typography, borderRadius } from '@/theme';
import { useColors, useResolvedScheme } from '@/hooks/useColors';
import { useAccentColor } from '@/hooks/useAccentColor';
import { MILESTONE_META } from '@/features/timeline/milestoneMeta';
import type { MilestoneType } from '@/store/timelineStore';
import { BuddyAvatar, isBuddyId } from './BuddyAvatar';
import { PROGRAMS, currentStep, stopOf, type ProgramId, type SharedTimeline } from '../model';

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

/** One shared timeline as a card: avatar, name, a stage pill, and the day count. */
export function PersonCard({ timeline, onPress }: { timeline: SharedTimeline; onPress?: () => void }) {
  const c = useColors();
  const { t } = useTranslation();
  const tone = useStageTone();
  const now = currentStep(timeline);
  const alias = timeline.alias || t('community.anonymous');
  const pill = now ? tone(now.type) : undefined;
  return (
    <TouchableOpacity ph-label="community-row" activeOpacity={0.8} onPress={onPress} disabled={!onPress}
      style={[s.card, { backgroundColor: c.surfaceCard }]} accessibilityRole={onPress ? 'button' : undefined}>
      <Avatar alias={alias} avatar={timeline.avatar} />
      <View style={s.mid}>
        <Text style={[s.name, { color: c.textPrimary }]} numberOfLines={1}>{alias}</Text>
        {now && pill && (
          <View style={[s.pill, { backgroundColor: pill.tint }]}>
            <Text style={[s.pillTxt, { color: pill.ink }]} numberOfLines={1}>{t(MILESTONE_META[now.type].labelKey)}</Text>
          </View>
        )}
      </View>
      {now && (
        <View style={s.right}>
          <Text style={[s.day, { color: c.textPrimary }]}>{now.day}</Text>
          <Text style={[s.days, { color: c.textMuted }]}>{t('community.days')}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  avatar: { alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { fontWeight: typography.bold },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: borderRadius.lg, padding: 14,
          shadowColor: '#0F172A', shadowOpacity: 0.05, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  mid: { flex: 1, minWidth: 0, alignItems: 'flex-start' },
  name: { fontSize: typography.base, fontWeight: typography.semibold },
  pill: { marginTop: 6, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, maxWidth: '100%' },
  pillTxt: { fontSize: typography.xs, fontWeight: typography.semibold },
  right: { alignItems: 'flex-end' },
  day: { fontSize: 22, fontWeight: '800', fontVariant: ['tabular-nums'] },
  days: { fontSize: 11 },
});
