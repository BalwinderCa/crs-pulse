import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { format, parseISO } from 'date-fns';
import { enUS, fr } from 'date-fns/locale';
import { palette, spacing, typography, borderRadius } from '@/theme';
import { useColors, useResolvedScheme } from '@/hooks/useColors';
import { useAccentColor } from '@/hooks/useAccentColor';
import { MILESTONE_META } from '@/features/timeline/milestoneMeta';
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
 * One shared timeline as a card: the avatar inside a ring that fills by stage
 * (ITA → Decision), the name, the latest step and program · AOR month, and the
 * day reached with the stage count.
 */
// Same colours as DrawCard's CATEGORY_COLOR (CEC, General, Trades); PNP draws use the accent there too.
const PROGRAM_COLOR: Partial<Record<ProgramId, string>> = {
  cec: palette.success, fsw: palette.gray300, fst: palette.warning, aip: palette.gray300, other: palette.gray300,
};

export function PersonCard({ timeline, onPress }: { timeline: SharedTimeline; onPress?: () => void }) {
  const c = useColors();
  const accent = useAccentColor();
  const { t, i18n } = useTranslation();
  const programLabel = useProgramLabel();
  const tone = useStageTone();
  const now = currentStep(timeline);
  const reached = reachedIndex(timeline);
  const alias = timeline.alias || t('community.anonymous');
  const st = now ? tone(now.type) : undefined;
  const aor = timeline.aorMonth
    ? t('community.aorIn', { month: format(parseISO(`${timeline.aorMonth}-01`), 'MMM yyyy', { locale: i18n.language?.startsWith('fr') ? fr : enUS }) })
    : null;
  const meta = [programLabel(timeline.program), aor].filter(Boolean).join(' · ');
  const stepLabel = now ? t(MILESTONE_META[now.type].labelKey) : '';
  const stages = reached + 1;
  const label = [alias, stepLabel, now ? t('community.dayN', { n: now.day }) : '', meta,
    stages > 0 ? t('community.stageOf', { n: stages, total: STOPS.length }) : ''].filter(Boolean).join(', ');
  const dash = RING_C * Math.max(0, stages) / STOPS.length;

  return (
    <TouchableOpacity ph-label="community-row" activeOpacity={0.8} onPress={onPress} disabled={!onPress}
      style={[s.card, { backgroundColor: c.surfaceCard, borderLeftColor: PROGRAM_COLOR[timeline.program] ?? accent }]} accessibilityRole={onPress ? 'button' : undefined}
      accessible accessibilityLabel={label}>
      <View style={s.ring}>
        <Svg width={RING} height={RING} style={StyleSheet.absoluteFill}>
          <Circle cx={RING / 2} cy={RING / 2} r={RING_R} stroke={c.border} strokeWidth={4} fill="none" />
          {st && dash > 0 && (
            <Circle cx={RING / 2} cy={RING / 2} r={RING_R} stroke={st.ink} strokeWidth={4} fill="none" strokeLinecap="round"
              strokeDasharray={`${dash} ${RING_C}`} transform={`rotate(-90 ${RING / 2} ${RING / 2})`} />
          )}
        </Svg>
        <Avatar alias={alias} avatar={timeline.avatar} size={44} />
      </View>
      <View style={s.mid}>
        <Text style={[s.name, { color: c.textPrimary }]} numberOfLines={1}>{alias}</Text>
        {now && st && <Text style={[s.step, { color: st.ink }]} numberOfLines={1}>{stepLabel}</Text>}
        <Text style={[s.meta, { color: c.textMuted }]} numberOfLines={1}>{meta}</Text>
      </View>
      {now && (
        <View style={s.right}>
          <Text style={[s.day, { color: c.textPrimary }]}>{t('community.dayN', { n: now.day })}</Text>
          {stages > 0 && <Text style={[s.stages, { color: c.textMuted }]}>{stages}/{STOPS.length}</Text>}
        </View>
      )}
    </TouchableOpacity>
  );
}

const RING = 62;
const RING_R = 27;
const RING_C = 2 * Math.PI * RING_R;

const s = StyleSheet.create({
  avatar: { alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { fontWeight: typography.bold },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: borderRadius.lg, paddingVertical: 12, paddingHorizontal: 14, borderLeftWidth: 3,
          shadowColor: '#0F172A', shadowOpacity: 0.05, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  ring: { width: RING, height: RING, alignItems: 'center', justifyContent: 'center' },
  mid: { flex: 1, minWidth: 0 },
  name: { fontSize: typography.base, fontWeight: typography.semibold },
  step: { fontSize: typography.sm, fontWeight: typography.semibold, marginTop: 2 },
  meta: { fontSize: typography.xs, fontWeight: typography.medium, marginTop: 2 },
  right: { alignItems: 'flex-end' },
  day: { fontSize: 18, fontWeight: '800', fontVariant: ['tabular-nums'] },
  stages: { fontSize: typography.xs, fontWeight: typography.medium, marginTop: 2, fontVariant: ['tabular-nums'] },
});
