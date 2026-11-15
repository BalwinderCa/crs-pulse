import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { palette, spacing, typography, borderRadius } from '@/theme';
import { useColors } from '@/hooks/useColors';
import { useAccentColor } from '@/hooks/useAccentColor';
import { Button } from '@/components/common/Button';
import { useTimelineStore } from '@/store/timelineStore';
import { MILESTONE_META } from '@/features/timeline/milestoneMeta';
import { PROGRAMS, currentStep, toSharedSteps, typicalPace, type ProgramId, type SharedTimeline } from '../model';
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
  const myNow = mine ? currentStep(mine) : undefined;

  return (
    <View style={s.wrap}>
      {/* Your timeline: shared card, or the invitation */}
      {mine ? (
        <View style={s.section}>
          <View style={s.sectionHead}>
            <Text style={[s.sectionTitle, { color: c.textMuted }]}>{t('community.yourShared')}</Text>
            <TouchableOpacity ph-label="community-share-edit" onPress={() => setSharing(true)} hitSlop={8}>
              <Text style={[s.link, { color: accent }]}>{t('community.edit')}</Text>
            </TouchableOpacity>
          </View>
          <SharedTimelineCard timeline={mine} onPress={() => setOpen(mine)} />
        </View>
      ) : (
        <View style={[s.cta, { backgroundColor: accent + '14', borderColor: accent + '55' }]}>
          <View style={s.ctaHead}>
            <Ionicons name="share-social" size={20} color={accent} />
            <Text style={[s.ctaTitle, { color: c.textPrimary }]}>{t('community.shareCtaTitle')}</Text>
          </View>
          <Text style={[s.ctaBody, { color: c.textSecondary }]}>{t('community.shareCtaBody')}</Text>
          <Button ph-label="community-share-open" title={t('community.shareCtaButton')} onPress={() => setSharing(true)} />
        </View>
      )}

      {/* Program filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
        {(['all', ...programsShown.map((p) => p.id)] as (ProgramId | 'all')[]).map((id) => {
          const on = filter === id;
          return (
            <TouchableOpacity key={id} ph-label={`community-filter-${id}`} onPress={() => setFilter(id)}
              style={[s.chip, { borderColor: on ? accent : c.border, backgroundColor: on ? accent : c.surfaceCard }]}>
              <Text style={[s.chipTxt, { color: on ? palette.white : c.textSecondary }]}>
                {id === 'all' ? t('community.filterAll') : programLabel(id)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Typical pace for the filter */}
      {pace.length > 0 && (
        <View style={[s.pace, { backgroundColor: c.surfaceCard, borderColor: c.border }]}>
          <Text style={[s.paceTitle, { color: c.textPrimary }]}>{t('community.paceTitle')}</Text>
          <Text style={[s.paceSub, { color: c.textMuted }]}>
            {t('community.paceSub', { program: filter === 'all' ? t('community.filterAll') : programLabel(filter), n: others.length })}
          </Text>
          <View style={s.paceGrid}>
            {pace.map((p) => (
              <View key={p.stop} style={[s.paceCell, { backgroundColor: c.surfaceSecondary }]}>
                <Text style={[s.paceDay, { color: c.textPrimary }]}>{t('community.dayN', { n: p.day })}</Text>
                <Text style={[s.paceStop, { color: c.textMuted }]} numberOfLines={1}>{t(`community.stops.${p.stop}`)}</Text>
              </View>
            ))}
          </View>
          {myNow && (
            <View style={[s.you, { borderTopColor: c.border }]}>
              <Ionicons name="navigate" size={14} color={accent} />
              <Text style={[s.youTxt, { color: c.textSecondary }]}>
                {t('community.paceYou', { day: myNow.day, step: t(MILESTONE_META[myNow.type].labelKey) })}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Everyone */}
      <Text style={[s.sectionTitle, { color: c.textMuted, marginTop: spacing.xs }]}>{t('community.listTitle')}</Text>
      {others.length === 0 ? (
        <Text style={[s.empty, { color: c.textMuted }]}>{t('community.empty')}</Text>
      ) : (
        others.map((tl) => <SharedTimelineCard key={tl.id} timeline={tl} onPress={() => setOpen(tl)} />)
      )}
      <Text style={[s.sample, { color: c.textMuted }]}>{t('community.sampleNote')}</Text>

      <ShareTimelineModal visible={sharing} onClose={() => setSharing(false)} />
      <TimelineDetailModal timeline={open} onClose={() => setOpen(null)} />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: spacing.md, paddingTop: spacing.sm },
  section: { gap: spacing.sm },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: typography.xs, fontWeight: typography.semibold, letterSpacing: 0.8, textTransform: 'uppercase' },
  link: { fontSize: typography.sm, fontWeight: typography.semibold },
  cta: { borderRadius: borderRadius.md, borderWidth: 1, padding: spacing.base, gap: spacing.sm },
  ctaHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  ctaTitle: { fontSize: typography.base, fontWeight: typography.bold },
  ctaBody: { fontSize: typography.sm, lineHeight: 20 },
  chips: { gap: spacing.sm, paddingVertical: 2 },
  chip: { paddingHorizontal: spacing.md, paddingVertical: 7, borderRadius: borderRadius.full, borderWidth: 1 },
  chipTxt: { fontSize: typography.sm, fontWeight: typography.semibold },
  pace: { borderRadius: borderRadius.md, borderWidth: 0.3, padding: spacing.base, gap: spacing.sm },
  paceTitle: { fontSize: typography.base, fontWeight: typography.bold },
  paceSub: { fontSize: typography.xs, marginTop: -4 },
  paceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  paceCell: { flexGrow: 1, minWidth: '30%', borderRadius: borderRadius.sm, paddingVertical: spacing.sm, paddingHorizontal: spacing.sm, alignItems: 'center' },
  paceDay: { fontSize: typography.base, fontWeight: typography.bold, fontVariant: ['tabular-nums'] },
  paceStop: { fontSize: typography.xs, marginTop: 2 },
  you: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.sm },
  youTxt: { flex: 1, fontSize: typography.sm },
  empty: { fontSize: typography.sm, textAlign: 'center', paddingVertical: spacing.lg },
  sample: { fontSize: typography.xs, textAlign: 'center', lineHeight: 17, marginTop: spacing.xs },
});
