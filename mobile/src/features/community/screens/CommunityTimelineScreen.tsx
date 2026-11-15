import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { format, parseISO } from 'date-fns';
import { spacing, typography, borderRadius } from '@/theme';
import { useColors } from '@/hooks/useColors';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { MILESTONE_META } from '@/features/timeline/milestoneMeta';
import type { RootStackParamList } from '@/types';
import { STOPS, currentStep, reachedIndex, stopOf, typicalPace, type SharedTimeline } from '../model';
import { useCommunity, useSharedTimeline } from '../useCommunity';
import { useProgramLabel } from '../components/TimelineCards';
import { ShareTimelineModal } from '../components/ShareTimelineModal';

/** First day a timeline reached `stop`, if it did. */
const dayAt = (tl: { steps: SharedTimeline['steps'] }, stop: string) =>
  tl.steps.find((s) => stopOf(s.type) === stop)?.day;

/** One shared timeline: who, where they are, every step with its gap, and how it compares with yours. */
export default function CommunityTimelineScreen() {
  const c = useColors();
  const accent = useAccentColor();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { contentFrameStyle } = useResponsiveLayout();
  const programLabel = useProgramLabel();
  const { params } = useRoute<RouteProp<RootStackParamList, 'CommunityTimeline'>>();
  const timeline = useSharedTimeline(params.id);
  const { others, mySteps } = useCommunity();
  const [editing, setEditing] = useState(false);

  const view = useMemo(() => {
    if (!timeline) return null;
    const now = currentStep(timeline);
    const reached = reachedIndex(timeline);
    const peers = others.filter((o) => o.program === timeline.program);
    const pace = typicalPace(peers);
    const decided = STOPS[reached] === 'decision';
    const decisionDay = pace.find((p) => p.stop === 'decision')?.day;
    const toDecision = !decided && now && decisionDay !== undefined ? decisionDay - now.day : undefined;
    const nextStop = decided ? undefined : STOPS[reached + 1];
    const nextDay = nextStop ? pace.find((p) => p.stop === nextStop)?.day : undefined;

    // "Compared with you": the furthest stop you have both reached.
    let compare: { stop: string; mine: number; theirs: number } | undefined;
    if (!timeline.isMine) {
      for (let i = STOPS.length - 1; i > 0 && !compare; i--) {
        const stop = STOPS[i]!;
        const mineDay = dayAt({ steps: mySteps }, stop);
        const theirs = dayAt(timeline, stop);
        if (mineDay !== undefined && theirs !== undefined) compare = { stop, mine: mineDay, theirs };
      }
    }
    const firstMonth = timeline.steps[0]?.month;
    return { now, nextStop, nextDay, toDecision, compare, firstMonth };
  }, [timeline, others, mySteps]);

  const back = (
    <TouchableOpacity ph-label="community-detail-back" onPress={() => navigation.goBack()} style={s.back}
      accessibilityRole="button" accessibilityLabel={t('community.back')}>
      <Ionicons name="chevron-back" size={22} color={accent} />
      <Text style={[s.backTxt, { color: accent }]}>{t('timeline.tabCommunity')}</Text>
    </TouchableOpacity>
  );

  if (!timeline || !view) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: c.surfacePrimary }]} edges={['top', 'left', 'right']}>
        {back}
        <Text style={[s.missing, { color: c.textMuted }]}>{t('community.missing')}</Text>
      </SafeAreaView>
    );
  }

  const alias = timeline.alias || t('community.anonymous');
  const sub = [
    programLabel(timeline.program),
    view.firstMonth ? t('community.started', { month: format(parseISO(`${view.firstMonth}-01`), 'MMMM yyyy') }) : null,
    timeline.updatedDaysAgo === 0 ? t('community.updatedToday') : t('community.updatedDaysAgo', { n: timeline.updatedDaysAgo }),
  ].filter(Boolean).join(' · ');

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.surfacePrimary }]} edges={['top', 'left', 'right']}>
      {back}
      <ScrollView contentContainerStyle={[s.body, contentFrameStyle, { paddingBottom: insets.bottom + spacing['2xl'] }]}
        showsVerticalScrollIndicator={false}>
        <Text style={[s.name, { color: c.textPrimary }]}>{alias}</Text>
        <Text style={[s.sub, { color: c.textMuted }]}>{sub}</Text>

        {/* Two figures */}
        <View style={[s.stats, { borderColor: c.border }]}>
          <View style={s.stat}>
            <Text style={[s.statBig, { color: c.textPrimary }]}>{t('community.dayN', { n: view.now?.day ?? 0 })}</Text>
            <Text style={[s.statSub, { color: c.textMuted }]} numberOfLines={1}>
              {view.now ? t(MILESTONE_META[view.now.type].labelKey) : ''}
            </Text>
          </View>
          <View style={[s.stat, s.statRight, { borderLeftColor: c.border }]}>
            {view.toDecision !== undefined && view.toDecision > 0 ? (
              <>
                <Text style={[s.statBig, { color: c.textPrimary }]}>{t('community.aboutDays', { n: view.toDecision })}</Text>
                <Text style={[s.statSub, { color: c.textMuted }]}>{t('community.toTypicalDecision')}</Text>
              </>
            ) : (
              <>
                <Text style={[s.statBig, { color: c.textPrimary }]}>{timeline.steps.length}</Text>
                <Text style={[s.statSub, { color: c.textMuted }]}>{t('community.stepsLogged')}</Text>
              </>
            )}
          </View>
        </View>

        {/* Journey */}
        <Text style={[s.section, { color: c.textMuted }]}>{t('community.journey')}</Text>
        {timeline.steps.map((step, i) => {
          const last = i === timeline.steps.length - 1;
          const gap = i === 0
            ? (step.month ? format(parseISO(`${step.month}-01`), 'MMMM yyyy') : t('community.start'))
            : `${t('community.plusDays', { n: step.day - timeline.steps[i - 1]!.day })}${last ? ` · ${t('community.latest')}` : ''}`;
          const hasNext = !last || !!view.nextStop;
          return (
            <View key={`${step.type}-${i}`} style={s.stepRow}>
              <View style={s.rail}>
                <View style={[s.dot, { backgroundColor: last ? accent : c.textPrimary }]} />
                {hasNext && <View style={[s.line, { backgroundColor: c.border }]} />}
              </View>
              <View style={s.stepBody}>
                <View style={s.flex}>
                  <Text style={[s.stepLabel, { color: c.textPrimary }, last && { fontWeight: typography.bold }]}>
                    {t(MILESTONE_META[step.type].labelKey)}
                  </Text>
                  <Text style={[s.stepGap, { color: c.textMuted }]}>{gap}</Text>
                </View>
                <Text style={[s.stepDay, { color: c.textPrimary }]}>{t('community.dayN', { n: step.day })}</Text>
              </View>
            </View>
          );
        })}
        {view.nextStop && (
          <View style={s.stepRow}>
            <View style={s.rail}>
              <View style={[s.dot, s.dotNext, { borderColor: c.textMuted }]} />
            </View>
            <View style={s.stepBody}>
              <View style={s.flex}>
                <Text style={[s.stepLabel, { color: c.textMuted }]}>{t(`community.stops.${view.nextStop}`)}</Text>
                <Text style={[s.stepGap, { color: c.textMuted }]}>
                  {t('community.typicalFor', { program: programLabel(timeline.program) })}
                </Text>
              </View>
              <Text style={[s.stepDay, { color: c.textMuted }]}>
                {view.nextDay !== undefined ? `~ ${t('community.dayN', { n: view.nextDay })}` : ''}
              </Text>
            </View>
          </View>
        )}

        {/* Compared with you */}
        {view.compare && (
          <View style={[s.compare, { backgroundColor: c.surfaceSecondary }]}>
            <Text style={[s.compareHead, { color: c.textSecondary }]}>{t('community.comparedWithYou')}</Text>
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

        {timeline.isMine ? (
          <TouchableOpacity ph-label="community-share-edit" onPress={() => setEditing(true)} style={s.footBtn}>
            <Text style={[s.footTxt, { color: accent }]}>{t('community.editSharing')}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity ph-label="community-report" style={s.footBtn}
            // No server yet: Community is not live, so this only acknowledges.
            onPress={() => Toast.show({ type: 'success', text1: t('community.reported') })}>
            <Text style={[s.footTxt, { color: c.textMuted }]}>{t('community.report')}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
      <ShareTimelineModal visible={editing} onClose={() => setEditing(false)} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1, minWidth: 0 },
  back: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', minHeight: 44, paddingHorizontal: spacing.sm, gap: 2 },
  backTxt: { fontSize: typography.base, fontWeight: typography.medium },
  missing: { textAlign: 'center', marginTop: spacing['2xl'], fontSize: typography.sm },
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.xs },
  name: { fontSize: 28, fontWeight: typography.bold, letterSpacing: -0.5 },
  sub: { fontSize: typography.sm, marginTop: 4 },
  stats: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, marginTop: spacing.lg },
  stat: { flex: 1, paddingVertical: spacing.md, gap: 2 },
  statRight: { borderLeftWidth: StyleSheet.hairlineWidth, paddingLeft: spacing.base },
  statBig: { fontSize: 22, fontWeight: typography.bold, fontVariant: ['tabular-nums'] },
  statSub: { fontSize: typography.sm },
  section: { fontSize: typography.xs, fontWeight: typography.semibold, letterSpacing: 0.6, textTransform: 'uppercase',
             marginTop: spacing.xl, marginBottom: spacing.sm },
  stepRow: { flexDirection: 'row', gap: 14 },
  rail: { width: 12, alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  dotNext: { backgroundColor: 'transparent', borderWidth: 1.5 },
  line: { flex: 1, width: 1.5, marginTop: 4 },
  stepBody: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, paddingBottom: 18 },
  stepLabel: { fontSize: typography.base, fontWeight: typography.medium },
  stepGap: { fontSize: typography.sm, marginTop: 2 },
  stepDay: { fontSize: typography.base, fontWeight: typography.semibold, fontVariant: ['tabular-nums'] },
  compare: { borderRadius: borderRadius.md, padding: spacing.base, gap: 4, marginTop: spacing.xs },
  compareHead: { fontSize: typography.sm, fontWeight: typography.semibold },
  compareTxt: { fontSize: typography.sm, lineHeight: 20 },
  footBtn: { alignSelf: 'center', minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.base, marginTop: spacing.lg },
  footTxt: { fontSize: typography.sm, fontWeight: typography.medium },
});
