import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { palette, spacing, typography, borderRadius } from '@/theme';
import { useColors } from '@/hooks/useColors';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useTimelineStore } from '@/store/timelineStore';
import { PROGRAMS, toSharedSteps, typicalPace, type ProgramId, type SharedTimeline } from '../model';
import { SAMPLE_TIMELINES } from '../sampleTimelines';
import { useShareStore } from '../shareStore';
import { SharedTimelineCard, useProgramLabel } from './TimelineCards';
import { ShareTimelineModal } from './ShareTimelineModal';
import { TimelineDetailModal } from './TimelineDetailModal';

/**
 * The Community feed: the user's own shared card (or an invitation to share),
 * a program filter, the typical pace for that program, and everyone's cards.
 * Until there is a server it lists SAMPLE_TIMELINES, and shows only in dev.
 */
export function CommunityFeed() {
  const c = useColors();
  const accent = useAccentColor();
  const { t } = useTranslation();
  const programLabel = useProgramLabel();
  const milestones = useTimelineStore((st) => st.milestones);
  const { settings, load } = useShareStore();
  const [filter, setFilter] = useState<ProgramId | 'all'>('all');
  const [sharing, setSharing] = useState(false);
  const [open, setOpen] = useState<SharedTimeline | null>(null);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (settings) setFilter((f) => (f === 'all' ? settings.program : f)); }, [settings]);

  const mine: SharedTimeline | null = useMemo(() => {
    if (!settings) return null;
    const steps = toSharedSteps(milestones, settings.showMonths);
    return steps.length ? { id: 'mine', alias: settings.alias, program: settings.program, steps, updatedDaysAgo: 0, isMine: true } : null;
  }, [settings, milestones]);

  const programsShown = PROGRAMS.filter((p) => SAMPLE_TIMELINES.some((tl) => tl.program === p.id) || p.id === mine?.program);
  const others = SAMPLE_TIMELINES.filter((tl) => filter === 'all' || tl.program === filter);
  const pace = typicalPace(others);

  // One quiet line: the median day for the stops people care most about.
  const paceLine = pace
    .filter((p) => p.stop === 'aor' || p.stop === 'ppr' || p.stop === 'decision')
    .map((p) => `${t(`community.stops.${p.stop}`)} ${t('community.dayN', { n: p.day })}`)
    .join('  ·  ');

  return (
    <View style={s.wrap}>
      {mine ? (
        <SharedTimelineCard timeline={mine} onPress={() => setOpen(mine)} />
      ) : (
        <TouchableOpacity ph-label="community-share-open" onPress={() => setSharing(true)} activeOpacity={0.85}
          style={[s.cta, { backgroundColor: accent + '14', borderColor: accent + '55' }]} accessibilityRole="button">
          <Ionicons name="share-social" size={18} color={accent} />
          <Text style={[s.ctaTitle, { color: c.textPrimary }]}>{t('community.shareCtaButton')}</Text>
          <Ionicons name="chevron-forward" size={16} color={accent} />
        </TouchableOpacity>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
        {(['all', ...programsShown.map((p) => p.id)] as (ProgramId | 'all')[]).map((id) => {
          const on = filter === id;
          return (
            <TouchableOpacity key={id} ph-label={`community-filter-${id}`} onPress={() => setFilter(id)}
              style={[s.chip, { borderColor: on ? accent : c.border, backgroundColor: on ? accent : 'transparent' }]}>
              <Text style={[s.chipTxt, { color: on ? palette.white : c.textSecondary }]}>
                {id === 'all' ? t('community.filterAll') : programLabel(id)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {!!paceLine && (
        <Text style={[s.pace, { color: c.textMuted }]} numberOfLines={2}>
          <Text style={{ fontWeight: typography.semibold, color: c.textSecondary }}>{t('community.paceTitle')}</Text>
          {'  '}{paceLine}
        </Text>
      )}

      {others.length === 0 ? (
        <Text style={[s.empty, { color: c.textMuted }]}>{t('community.empty')}</Text>
      ) : (
        others.map((tl) => <SharedTimelineCard key={tl.id} timeline={tl} onPress={() => setOpen(tl)} />)
      )}

      <ShareTimelineModal visible={sharing} onClose={() => setSharing(false)} />
      <TimelineDetailModal timeline={open} onClose={() => setOpen(null)} onEdit={mine && open?.isMine ? () => { setOpen(null); setSharing(true); } : undefined} />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: spacing.sm, paddingTop: spacing.sm },
  cta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: borderRadius.md, borderWidth: 1,
         paddingHorizontal: spacing.base, paddingVertical: spacing.md },
  ctaTitle: { flex: 1, fontSize: typography.base, fontWeight: typography.semibold },
  chips: { gap: spacing.sm, paddingVertical: spacing.xs },
  chip: { paddingHorizontal: spacing.md, paddingVertical: 5, borderRadius: borderRadius.full, borderWidth: 1 },
  chipTxt: { fontSize: typography.xs, fontWeight: typography.semibold },
  pace: { fontSize: typography.xs, lineHeight: 17, marginBottom: spacing.xs },
  empty: { fontSize: typography.sm, textAlign: 'center', paddingVertical: spacing.lg },
});
