import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { palette, spacing, typography, borderRadius } from '@/theme';
import { useColors } from '@/hooks/useColors';
import { useAccentColor } from '@/hooks/useAccentColor';
import { MILESTONE_META } from '@/features/timeline/milestoneMeta';
import { PROGRAMS, STOPS, currentStep, reachedIndex, type ProgramId, type SharedTimeline } from '../model';

export function useProgramLabel() {
  const { t } = useTranslation();
  return (id: ProgramId) => PROGRAMS.find((p) => p.id === id)?.code || t('community.programOther');
}

/** Six stops from ITA to decision; the ones reached are filled, the current one ringed. */
export function StopTrack({ reached, showLabels = false }: { reached: number; showLabels?: boolean }) {
  const c = useColors();
  const accent = useAccentColor();
  const { t } = useTranslation();
  return (
    <View>
      <View style={s.track}>
        {STOPS.map((stop, i) => {
          const done = i <= reached;
          const current = i === reached;
          return (
            <React.Fragment key={stop}>
              {i > 0 && <View style={[s.trackLine, { backgroundColor: i <= reached ? accent : c.border }]} />}
              <View
                style={[
                  s.trackDot,
                  { backgroundColor: done ? accent : c.surfaceSecondary, borderColor: done ? accent : c.border },
                  current && { width: 14, height: 14, borderRadius: 7, borderWidth: 3, borderColor: accent + '55' },
                ]}
              />
            </React.Fragment>
          );
        })}
      </View>
      {showLabels && (
        <View style={s.trackLabels}>
          {STOPS.map((stop, i) => (
            <Text key={stop} style={[s.trackLabel, { color: i <= reached ? c.textSecondary : c.textMuted }]} numberOfLines={1}>
              {t(`community.stops.${stop}`)}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

export function Avatar({ alias, size = 40 }: { alias: string; size?: number }) {
  const accent = useAccentColor();
  const { t } = useTranslation();
  const anon = !alias || alias === t('community.anonymous');
  return (
    <View style={[s.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: accent + '1F' }]}>
      {anon
        ? <Ionicons name="person" size={size * 0.45} color={accent} />
        : <Text style={[s.avatarTxt, { color: accent, fontSize: size * 0.42 }]}>{alias.trim()[0]!.toUpperCase()}</Text>}
    </View>
  );
}

/** One shared timeline in the feed: who, which program, where they are, and the track. */
export function SharedTimelineCard({ timeline, onPress }: { timeline: SharedTimeline; onPress?: () => void }) {
  const c = useColors();
  const accent = useAccentColor();
  const { t } = useTranslation();
  const programLabel = useProgramLabel();
  const now = currentStep(timeline);
  const meta = now ? MILESTONE_META[now.type] : undefined;
  const alias = timeline.alias || t('community.anonymous');
  const updated = timeline.updatedDaysAgo === 0
    ? t('community.updatedToday')
    : t('community.updatedDaysAgo', { n: timeline.updatedDaysAgo });

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      disabled={!onPress}
      onPress={onPress}
      style={[s.card, { backgroundColor: c.surfaceCard, borderColor: timeline.isMine ? accent : c.border }, timeline.isMine && { borderWidth: 1 }]}
      accessibilityRole={onPress ? 'button' : undefined}
    >
      <View style={s.cardTop}>
        <Avatar alias={alias} />
        <View style={s.cardWho}>
          <View style={s.nameRow}>
            <Text style={[s.alias, { color: c.textPrimary }]} numberOfLines={1}>{alias}</Text>
            {timeline.isMine && (
              <View style={[s.youBadge, { backgroundColor: accent }]}>
                <Text style={s.youTxt}>{t('community.you')}</Text>
              </View>
            )}
          </View>
          <Text style={[s.sub, { color: c.textMuted }]}>{programLabel(timeline.program)} · {updated}</Text>
        </View>
        {onPress && <Ionicons name="chevron-forward" size={16} color={c.textMuted} />}
      </View>

      {now && meta && (
        <View style={[s.nowRow, { backgroundColor: meta.color + '14' }]}>
          <View style={[s.nowIcon, { backgroundColor: meta.color + '24' }]}>
            <Ionicons name={meta.icon} size={16} color={meta.color} />
          </View>
          <Text style={[s.nowLabel, { color: c.textPrimary }]} numberOfLines={1}>{t(meta.labelKey)}</Text>
          <Text style={[s.nowDay, { color: meta.color }]}>{t('community.dayN', { n: now.day })}</Text>
        </View>
      )}

      <StopTrack reached={reachedIndex(timeline)} showLabels />
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  track: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 },
  trackDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1 },
  trackLine: { flex: 1, height: 2, borderRadius: 1 },
  trackLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  trackLabel: { fontSize: 10, width: 54, textAlign: 'center', marginHorizontal: -16 },

  avatar: { alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { fontWeight: typography.bold },

  card: { borderRadius: borderRadius.md, borderWidth: 0.3, padding: spacing.base, gap: spacing.md },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cardWho: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  alias: { fontSize: typography.base, fontWeight: typography.semibold, flexShrink: 1 },
  youBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: borderRadius.full },
  youTxt: { color: palette.white, fontSize: 10, fontWeight: typography.bold, letterSpacing: 0.5 },
  sub: { fontSize: typography.xs, marginTop: 2 },
  nowRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: borderRadius.md, padding: spacing.sm },
  nowIcon: { width: 28, height: 28, borderRadius: borderRadius.sm, alignItems: 'center', justifyContent: 'center' },
  nowLabel: { flex: 1, fontSize: typography.sm, fontWeight: typography.semibold },
  nowDay: { fontSize: typography.sm, fontWeight: typography.bold, fontVariant: ['tabular-nums'] },
});
