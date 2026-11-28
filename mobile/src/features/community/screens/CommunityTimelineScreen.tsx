import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from '@/components/common/AppText';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { format, parseISO } from 'date-fns';
import { enUS, fr } from 'date-fns/locale';
import { spacing, typography, borderRadius } from '@/theme';
import { useColors } from '@/hooks/useColors';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { MILESTONE_META } from '@/features/timeline/milestoneMeta';
import { MilestoneIcon } from '@/features/timeline/components/MilestoneIcon';
import type { RootStackParamList } from '@/types';
import { STOPS, currentStep, reachedIndex, stopOf, type SharedTimeline } from '../model';
import { useCommunity, useCommunitySummary, useSharedTimeline } from '../useCommunity';
import { Avatar, useProgramLabel, useStageTone } from '../components/TimelineCards';
import { FilterSheet } from '../components/FilterSheet';
import { reportTimeline, type ReportReason } from '../communityApi';
import { useBlockedStore } from '../shareStore';
import { countCommunityView } from '@/services/adsService';

const REASONS: ReportReason[] = ['spam', 'offensive', 'misleading', 'other'];

/** First day a timeline reached `stop`, if it did. */
const dayAt = (steps: SharedTimeline['steps'], stop: string) => steps.find((s) => stopOf(s.type) === stop)?.day;

/** One shared timeline: a profile card, then every step as a card, and how it compares with yours. */
export default function CommunityTimelineScreen() {
  const c = useColors();
  const accent = useAccentColor();
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith('fr') ? fr : enUS;
  const navigation = useNavigation();
  const { contentFrameStyle } = useResponsiveLayout();
  const programLabel = useProgramLabel();
  const tone = useStageTone();
  const { params } = useRoute<RouteProp<RootStackParamList, 'CommunityTimeline'>>();
  const { timeline, loading } = useSharedTimeline(params.id);
  // One view per opened timeline (not your own); every 6th shows an interstitial.
  const viewedId = timeline && !timeline.isMine ? timeline.id : null;
  useEffect(() => { if (viewedId) countCommunityView(); }, [viewedId]);
  const pace = useCommunitySummary(timeline?.program);
  const { mySteps } = useCommunity();
  const [reporting, setReporting] = useState(false);

  const report = async (reason: ReportReason) => {
    if (!timeline) return;
    const ok = await reportTimeline(timeline.id, reason).then(() => true, () => false);
    Toast.show(ok ? { type: 'success', text1: t('community.reported') } : { type: 'error', text1: t('community.reportFailed') });
  };
  const block = async () => {
    if (!timeline) return;
    await useBlockedStore.getState().block(timeline.id).catch(() => {});
    Toast.show({ type: 'success', text1: t('community.blocked') });
    navigation.goBack();
  };

  const view = useMemo(() => {
    if (!timeline) return null;
    const now = currentStep(timeline);
    const reached = reachedIndex(timeline);
    const decided = STOPS[reached] === 'decision';
    const decisionDay = pace.find((p) => p.stop === 'decision')?.day;
    const toDecision = !decided && now && decisionDay !== undefined ? decisionDay - now.day : undefined;

    // "Compared with you": the furthest stop you have both reached.
    let compare: { stop: string; mine: number; theirs: number } | undefined;
    if (!timeline.isMine) {
      for (let i = STOPS.length - 1; i > 0 && !compare; i--) {
        const stop = STOPS[i]!;
        const mine = dayAt(mySteps, stop);
        const theirs = dayAt(timeline.steps, stop);
        if (mine !== undefined && theirs !== undefined) compare = { stop, mine, theirs };
      }
    }
    return { now, toDecision, compare, firstMonth: timeline.steps[0]?.month };
  }, [timeline, pace, mySteps]);

  const back = (
    <TouchableOpacity ph-label="community-detail-back" onPress={() => navigation.goBack()} style={s.back}
      accessibilityRole="button" accessibilityLabel={t(params.from === 'mine' ? 'community.backMine' : 'community.back')}>
      <Ionicons name="chevron-back" size={22} color={accent} />
      <Text style={[s.backTxt, { color: accent }]}>{t(params.from === 'mine' ? 'timeline.tabMine' : 'timeline.tabCommunity')}</Text>
    </TouchableOpacity>
  );

  if (!timeline || !view) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: c.surfacePrimary }]} edges={['top', 'left', 'right']}>
        {back}
        {loading
          ? <ActivityIndicator style={s.loading} color={accent} />
          : <Text style={[s.missing, { color: c.textMuted }]}>{t('community.missing')}</Text>}
      </SafeAreaView>
    );
  }

  const alias = timeline.alias || t('community.anonymous');
  const sub = [
    programLabel(timeline.program),
    view.firstMonth ? t('community.started', { month: format(parseISO(`${view.firstMonth}-01`), 'MMMM yyyy', { locale }) }) : null,
  ].filter(Boolean).join(' · ');
  const updated = timeline.updatedDaysAgo === 0 ? t('community.updatedToday') : t('community.updatedDaysAgo', { n: timeline.updatedDaysAgo });
  const nowTone = view.now ? tone(view.now.type) : undefined;

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.surfacePrimary }]} edges={['top', 'left', 'right']}>
      {back}
      <ScrollView contentContainerStyle={[s.body, contentFrameStyle, { paddingBottom: insets.bottom + spacing['2xl'] }]}
        showsVerticalScrollIndicator={false}>
        {/* Profile card: who, then where they are now */}
        <View style={[s.profile, { backgroundColor: c.surfaceCard }]}>
          <View style={s.who}>
            <Avatar alias={alias} avatar={timeline.avatar} size={56} />
            <View style={s.flex}>
              <Text style={[s.name, { color: c.textPrimary }]} numberOfLines={1}>{alias}</Text>
              <Text style={[s.sub, { color: c.textSecondary }]} numberOfLines={1}>{sub}</Text>
              <View style={s.metaRow}>
                <Text style={[s.updated, { color: c.textMuted }]}>{updated}</Text>
                {timeline.byAdmin && (
                  <View style={[s.chip, { backgroundColor: c.surfacePrimary }]}>
                    <Text style={[s.chipTxt, { color: c.textSecondary }]}>{t('community.postedByAdmin')}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {view.now && (
            <>
              <View style={[s.divider, { backgroundColor: c.border }]} />
              <View style={s.status}>
                <View style={[s.stagePill, { backgroundColor: nowTone?.tint ?? c.surfacePrimary }]}>
                  <MilestoneIcon meta={MILESTONE_META[view.now.type]} size={14} color={nowTone?.ink ?? c.textPrimary} />
                  <Text style={[s.stageTxt, { color: nowTone?.ink ?? c.textPrimary }]} numberOfLines={1}>
                    {t(MILESTONE_META[view.now.type].labelKey)}
                  </Text>
                </View>
                <Text style={[s.dayBig, { color: c.textPrimary }]}>{t('community.dayN', { n: view.now.day })}</Text>
              </View>
              {view.toDecision !== undefined && view.toDecision > 0 && (
                <View style={s.etaRow}>
                  <Ionicons name="time-outline" size={14} color={c.textMuted} />
                  <Text style={[s.eta, { color: c.textMuted }]}>
                    {t('community.aboutDays', { n: view.toDecision })} {t('community.toTypicalDecision')}
                  </Text>
                </View>
              )}
            </>
          )}
        </View>

        {/* Steps as cards */}
        {timeline.steps.map((step, i) => {
          const last = i === timeline.steps.length - 1;
          const meta = MILESTONE_META[step.type];
          const st = tone(step.type);
          const gap = i === 0
            ? (step.month ? format(parseISO(`${step.month}-01`), 'MMM yyyy', { locale }) : t('community.start'))
            : t('community.plusDays', { n: step.day - timeline.steps[i - 1]!.day });
          return (
            <View key={`${step.type}-${i}`}
              style={[s.step, { backgroundColor: c.surfaceCard, borderColor: last ? accent : c.surfaceCard }]}>
              <View style={[s.stepIcon, { backgroundColor: st.tint }]}>
                <MilestoneIcon meta={meta} size={16} color={st.ink} />
              </View>
              <Text style={[s.stepLabel, { color: c.textPrimary }, last && s.bold]} numberOfLines={1}>{t(meta.labelKey)}</Text>
              <Text style={[s.stepGap, { color: c.textMuted }]}>{gap}</Text>
              <Text style={[s.stepDay, { color: c.textPrimary }]}>{t('community.dayN', { n: step.day })}</Text>
            </View>
          );
        })}

        {view.compare && (
          <View style={[s.compare, { backgroundColor: c.surfaceCard }]}>
            <Text style={[s.compareHead, { color: c.textMuted }]}>{t('community.comparedWithYou')}</Text>
            <Text style={[s.compareTxt, { color: c.textPrimary }]}>
              {t('community.compareLine', {
                stop: t(`community.stops.${view.compare.stop}`),
                mine: view.compare.mine,
                name: alias,
                theirs: view.compare.theirs,
              })}
            </Text>
          </View>
        )}

        {!timeline.isMine && (
          <View style={s.footRow}>
            <TouchableOpacity ph-label="community-report" style={[s.footBtn, s.noTop]} onPress={() => setReporting(true)} accessibilityRole="button">
              <Text style={[s.footTxt, { color: c.textMuted }]}>{t('community.report')}</Text>
            </TouchableOpacity>
            <Text style={{ color: c.textMuted }}>·</Text>
            <TouchableOpacity ph-label="community-block" style={[s.footBtn, s.noTop]} onPress={block} accessibilityRole="button">
              <Text style={[s.footTxt, { color: c.textMuted }]}>{t('community.block')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
      <FilterSheet<ReportReason | null> visible={reporting} title={t('community.reportTitle')} selected={null}
        options={REASONS.map((r) => ({ value: r, label: t(`community.reportReasons.${r}`) }))}
        onSelect={(r) => { if (r) void report(r); }} onClose={() => setReporting(false)} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1, minWidth: 0 },
  bold: { fontWeight: typography.bold },
  back: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', minHeight: 44, paddingHorizontal: spacing.sm, gap: 2 },
  backTxt: { fontSize: typography.base, fontWeight: typography.medium },
  loading: { marginTop: spacing['2xl'] },
  missing: { textAlign: 'center', marginTop: spacing['2xl'], fontSize: typography.sm },
  body: { paddingHorizontal: spacing.base, paddingTop: spacing.xs, gap: spacing.sm },
  profile: { borderRadius: 20, padding: 18, marginBottom: spacing.xs },
  who: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  name: { fontSize: typography.lg, fontWeight: typography.bold },
  chip: { alignSelf: 'flex-start', borderRadius: borderRadius.full, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  chipTxt: { fontSize: typography.xs, fontWeight: typography.semibold },
  sub: { fontSize: typography.sm, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm, marginTop: 6 },
  updated: { fontSize: typography.xs },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 14 },
  status: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  stagePill: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1, borderRadius: borderRadius.full,
               paddingHorizontal: spacing.md, paddingVertical: 6 },
  stageTxt: { fontSize: typography.sm, fontWeight: typography.semibold, flexShrink: 1 },
  dayBig: { fontSize: 26, fontWeight: '800', fontVariant: ['tabular-nums'] },
  etaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm },
  eta: { fontSize: typography.xs },
  step: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: 14, borderWidth: 1.5,
          paddingVertical: 10, paddingHorizontal: spacing.md },
  stepIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  stepLabel: { flex: 1, fontSize: typography.sm, fontWeight: typography.medium },
  stepGap: { fontSize: typography.xs },
  stepDay: { minWidth: 64, textAlign: 'right', fontSize: typography.sm, fontWeight: typography.bold, fontVariant: ['tabular-nums'] },
  compare: { borderRadius: 14, padding: spacing.base, gap: 4, marginTop: spacing.xs },
  compareHead: { fontSize: typography.xs, fontWeight: typography.semibold, letterSpacing: 0.6, textTransform: 'uppercase' },
  compareTxt: { fontSize: typography.sm, lineHeight: 20 },
  noTop: { marginTop: 0 },
  footRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, marginTop: spacing.sm },
  footBtn: { alignSelf: 'center', minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.base, marginTop: spacing.sm },
  footTxt: { fontSize: typography.sm, fontWeight: typography.medium },
});
