import { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useProfileStore } from '@/store/profileStore';
import { useDrawsStore } from '@/store/drawsStore';
import { useApplicationStore } from '@/store/applicationStore';
import { useTimelineStore } from '@/store/timelineStore';
import { findApplicationType } from '@/features/tracker/data/processingTimes';
import { useProcessingTimes } from '@/features/tracker/hooks/useProcessingTimes';
import { Card } from '@/components/common/Card';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { AppHeader } from '@/components/layout/AppHeader';
import { palette, spacing, typography, borderRadius } from '@/theme';

const CAT_DOT_COLOR: Record<string, string> = {
  CEC: palette.success,
  General: palette.gray300,
  Healthcare: palette.blue,
  STEM: palette.blueLight,
  Trades: palette.warning,
  French: palette.danger,
};
import { useColors } from '@/hooks/useColors';
import { useAccentColor } from '@/hooks/useAccentColor';
import type { RootStackParamList, MainTabParamList } from '@/types';

const DAY_MS = 86_400_000;

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / DAY_MS);
}

export default function HomeScreen() {
  const c = useColors();
  const accent = useAccentColor();
  const { t } = useTranslation();
  const stackNav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const tabNav   = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const profile = useProfileStore((s) => s.profile);
  const { draws, isRefreshing, refresh } = useDrawsStore();
  const application = useApplicationStore((s) => s.application);
  const { categories, updatedLabel } = useProcessingTimes();
  const milestones = useTimelineStore((s) => s.milestones);
  const lastMilestone = milestones.length > 0 ? milestones[milestones.length - 1] : null;
  const lastMilestoneLabel = lastMilestone
    ? (lastMilestone.type === 'Custom' ? (lastMilestone.customLabel ?? 'Custom') : lastMilestone.type)
    : null;

  // Tracked application → progress vs typical IRCC processing time
  const tracked = useMemo(() => {
    if (!application) return null;
    const found = findApplicationType(application.categoryId, application.typeId, categories);
    if (!found) return null;
    const totalDays = Math.round(found.type.months * 30.44);
    if (!application.appliedDate) {
      return { ...found, applied: null, daysIn: null, totalDays, progress: 0, decisionDate: null };
    }
    const applied = new Date(application.appliedDate);
    const daysIn = Math.max(0, daysBetween(applied, new Date()));
    const decisionDate = new Date(applied.getTime() + totalDays * DAY_MS);
    return {
      ...found,
      applied,
      daysIn,
      totalDays,
      progress: Math.min(1, daysIn / totalDays),
      decisionDate,
    };
  }, [application, categories]);

  const score = profile?.crs_score ?? 0;
  const scoreReady = score > 0;
  const cat = profile?.category ?? 'General';


  return (
    <ScreenWrapper scrollable refreshing={isRefreshing} onRefresh={refresh}>
      <AppHeader title={t('home.title')} />

      {/* Score hero */}
      <Card style={s.heroCard}>
        {scoreReady ? (
          <>
            <View style={s.heroTop}>
              <View>
                <Text style={[s.heroLabel, { color: c.textMuted }]}>{t('home.yourCrsScore')}</Text>
                <Text style={[s.heroScore, { color: c.textPrimary }]}>{score}</Text>
              </View>
              <View style={[s.catBadge, { backgroundColor: accent + '18', borderColor: accent + '30' }]}>
                <Text style={[s.catText, { color: accent }]}>{cat}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[s.calcLink, { borderTopColor: c.border }]}
              onPress={() => stackNav.navigate('Calculators')}
              activeOpacity={0.65}
            >
              <Ionicons name="calculator-outline" size={15} color={accent} />
              <Text style={[s.calcLinkText, { color: accent }]}>{t('home.calculateScore')}</Text>
              <Ionicons name="chevron-forward" size={14} color={c.textMuted} />
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={s.setupRow} onPress={() => stackNav.navigate('Calculators')} activeOpacity={0.7}>
            <View style={[s.setupIcon, { backgroundColor: accent + '18' }]}>
              <Ionicons name="calculator-outline" size={22} color={accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.setupTitle, { color: c.textPrimary }]}>{t('home.calculateScore')}</Text>
              <Text style={[s.setupSub, { color: c.textSecondary }]}>{t('home.crsAndMore')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
          </TouchableOpacity>
        )}
      </Card>

      {/* My application tracker */}
      {tracked ? (
        <Card style={s.appCard}>
          <View style={s.appHeader}>
            <Text style={[s.sectionTitle, { color: c.textPrimary }]}>{t('home.myApplication')}</Text>
            <TouchableOpacity onPress={() => stackNav.navigate('ApplicationSetup')} hitSlop={10}>
              <Ionicons name="pencil-outline" size={16} color={c.textMuted} />
            </TouchableOpacity>
          </View>
          <Text style={[s.appType, { color: c.textSecondary }]}>
            {tracked.type.label}
            {tracked.type.method ? ` · ${tracked.type.method}` : ''}
          </Text>

          {tracked.applied && tracked.decisionDate ? (
            <>
              <View style={s.appStatsRow}>
                <View style={s.appStat}>
                  <Text style={[s.appStatVal, { color: c.textPrimary }]}>{tracked.daysIn}</Text>
                  <Text style={[s.appStatLabel, { color: c.textMuted }]}>{t('home.daysSinceApplied')}</Text>
                </View>
                <View style={[s.drawDivider, { backgroundColor: c.border }]} />
                <View style={s.appStat}>
                  <Text style={[s.appStatVal, { color: tracked.progress >= 1 ? palette.warning : accent }]}>
                    {Math.max(0, Math.ceil((tracked.totalDays - (tracked.daysIn ?? 0)) / 30.44))}
                  </Text>
                  <Text style={[s.appStatLabel, { color: c.textMuted }]}>{t('home.monthsLeft')}</Text>
                </View>
              </View>
              <View style={[s.appTrack, { backgroundColor: c.surfaceTertiary }]}>
                <View
                  style={[
                    s.appFill,
                    {
                      backgroundColor: tracked.progress >= 1 ? palette.warning : accent,
                      width: `${Math.min(100, Math.round(tracked.progress * 100))}%`,
                    },
                  ]}
                />
              </View>
              <View style={s.appProgressRow}>
                <Text style={[s.appProgressText, { color: c.textMuted }]}>
                  {t('home.appliedOn')}{' '}
                  {tracked.applied.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}
                </Text>
                <Text style={[s.appProgressText, { color: c.textMuted }]}>
                  {t('home.typicalPercent', { percent: Math.min(100, Math.round(tracked.progress * 100)) })}
                </Text>
              </View>

              {tracked.progress >= 1 ? (
                <View style={[s.overdueRow, { backgroundColor: palette.warning + '14' }]}>
                  <Ionicons name="alert-circle-outline" size={15} color={palette.warning} />
                  <Text style={[s.overdueText, { color: palette.warning }]}>
                    {t('home.overdueText')}
                  </Text>
                </View>
              ) : (
                <Text style={[s.appDecision, { color: c.textSecondary }]}>
                  {t('home.estimatedDecision')}{' '}
                  <Text style={{ color: accent, fontWeight: typography.bold }}>
                    {tracked.decisionDate.toLocaleDateString('en-CA', { month: 'long', year: 'numeric' })}
                  </Text>
                </Text>
              )}
            </>
          ) : (
            <Text style={[s.appDecision, { color: c.textSecondary }]}>
              {t('home.notSubmittedYet', { months: tracked.type.months })}
            </Text>
          )}

          <View style={[s.appInfoBox, { borderTopColor: c.border }]}>
            {tracked.type.peopleWaiting != null && (
              <View style={s.appInfoRow}>
                <Ionicons name="people-outline" size={14} color={c.textMuted} />
                <Text style={[s.appInfoText, { color: c.textSecondary }]}>
                  {t('home.peopleWaiting', { count: tracked.type.peopleWaiting.toLocaleString() })}
                </Text>
              </View>
            )}
            {tracked.type.peopleWaiting != null && (
              <View style={s.appInfoRow}>
                <Ionicons name="speedometer-outline" size={14} color={c.textMuted} />
                <Text style={[s.appInfoText, { color: c.textSecondary }]}>
                  {t('home.decisionsPerMonth', { count: Math.round(tracked.type.peopleWaiting / tracked.type.months).toLocaleString() })}
                </Text>
              </View>
            )}
            <View style={s.appInfoRow}>
              <Ionicons name="hourglass-outline" size={14} color={c.textMuted} />
              <Text style={[s.appInfoText, { color: c.textSecondary }]}>
                {t('home.processedInAbout', {
                  months: tracked.type.months,
                  unit: tracked.type.months === 1 ? t('home.month') : t('home.months'),
                  varies: tracked.type.varies ? t('home.variesByCase') : '',
                })}
              </Text>
            </View>
            <View style={s.appInfoRow}>
              <Ionicons name="refresh-outline" size={14} color={c.textMuted} />
              <Text style={[s.appInfoText, { color: c.textMuted }]}>
                {t('home.lastUpdated', { label: updatedLabel })}
              </Text>
            </View>
            <Text style={[s.appNote, { color: c.textMuted }]}>
              {t('home.processingNote')}
            </Text>
          </View>
        </Card>
      ) : (
        <Card style={s.appCard}>
          <TouchableOpacity
            style={s.setupRow}
            onPress={() => stackNav.navigate('ApplicationSetup')}
            activeOpacity={0.7}
          >
            <View style={[s.setupIcon, { backgroundColor: accent + '18' }]}>
              <Ionicons name="file-tray-full-outline" size={22} color={accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.setupTitle, { color: c.textPrimary }]}>{t('home.trackApplication')}</Text>
              <Text style={[s.setupSub, { color: c.textSecondary }]}>{t('home.appliedToIrcc')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
          </TouchableOpacity>
        </Card>
      )}

      {/* Timeline peek */}
      <Card style={s.appCard}>
        <TouchableOpacity
          style={s.setupRow}
          onPress={() => tabNav.navigate('Timeline')}
          activeOpacity={0.7}
        >
          <View style={[s.setupIcon, { backgroundColor: accent + '18' }]}>
            <Ionicons name="time-outline" size={22} color={accent} />
          </View>
          {lastMilestone && lastMilestoneLabel ? (
            <View style={{ flex: 1 }}>
              <Text style={[s.setupTitle, { color: c.textPrimary }]}>{lastMilestoneLabel}</Text>
              <Text style={[s.setupSub, { color: c.textSecondary }]}>
                {t('home.lastMilestone', { days: daysBetween(new Date(lastMilestone.date), new Date()) })}
              </Text>
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              <Text style={[s.setupTitle, { color: c.textPrimary }]}>{t('home.applicationTimeline')}</Text>
              <Text style={[s.setupSub, { color: c.textSecondary }]}>{t('home.trackItaAor')}</Text>
            </View>
          )}
          <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
        </TouchableOpacity>
      </Card>

      {/* Recent draws — compact list */}
      {draws.length > 0 && (
        <View style={s.sectionBlock}>
          <View style={s.sectionHeader}>
            <Text style={[s.sectionTitle, { color: c.textPrimary }]}>{t('home.recentDraws')}</Text>
            {draws[0] && (
              <View style={[s.sinceChip, { backgroundColor: c.surfaceSecondary }]}>
                <Ionicons name="time-outline" size={13} color={c.textMuted} />
                <Text style={[s.sinceChipLabel, { color: c.textMuted }]}>{t('home.lastDraw')}</Text>
                <Text style={[s.sinceChipValue, { color: c.textSecondary }]}>
                  {t('home.daysAgo', { days: daysBetween(new Date(draws[0].date), new Date()) })}
                </Text>
              </View>
            )}
          </View>
          <Card style={s.recentCard}>
            {draws.slice(0, 3).map((draw, i) => (
              <View key={draw.id}>
                {i > 0 && <View style={[s.recentDivider, { backgroundColor: c.border }]} />}
                <View style={s.recentRow}>
                  <View style={[s.recentDot, { backgroundColor: CAT_DOT_COLOR[draw.category] ?? accent }]} />
                  <View style={s.recentInfo}>
                    <View style={s.recentTopLine}>
                      <Text style={[s.recentNum, { color: c.textMuted }]}>#{draw.draw_number}</Text>
                      <Text style={[s.recentCat, { color: c.textPrimary }]} numberOfLines={1}>
                        {draw.category}
                      </Text>
                    </View>
                    <Text style={[s.recentMeta, { color: c.textMuted }]}>
                      {draw.invitations_issued.toLocaleString()} {t('home.invited')} · {format(new Date(draw.date), 'MMM d, yyyy')}
                    </Text>
                  </View>
                  <View style={s.recentRight}>
                    <Text style={[s.recentCutoffLabel, { color: c.textMuted }]}>{t('home.cutoff')}</Text>
                    <Text style={[s.recentCutoff, { color: accent }]}>{draw.cutoff_score}</Text>
                  </View>
                </View>
              </View>
            ))}
          </Card>
        </View>
      )}

    </ScreenWrapper>
  );
}

const s = StyleSheet.create({
  // Hero
  heroCard: { gap: spacing.sm, marginBottom: spacing.sm },
  heroTop:  { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  heroLabel: { fontSize: typography.xs, fontWeight: typography.bold, letterSpacing: 0.8 },
  heroScore: { fontSize: 48, fontWeight: typography.black, letterSpacing: -2, lineHeight: 54 },
  catBadge:  { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.md, borderWidth: 0.5 },
  catText:   { fontSize: typography.sm, fontWeight: typography.bold },
  deltaRow:  { flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
               paddingHorizontal: spacing.sm, paddingVertical: spacing.xs + 2, borderRadius: borderRadius.md },
  deltaText: { flex: 1, fontSize: typography.sm, fontWeight: typography.semibold, lineHeight: 18 },
  calcLink: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth, marginTop: spacing.xs, paddingTop: spacing.sm,
  },
  calcLinkText: { flex: 1, fontSize: typography.sm, fontWeight: typography.bold },

  setupRow:   { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xs },
  setupIcon:  { width: 44, height: 44, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center' },
  setupTitle: { fontSize: typography.base, fontWeight: typography.bold },
  setupSub:   { fontSize: typography.sm, lineHeight: 18, marginTop: 1 },

  // My application
  appCard:      { gap: spacing.xs, marginBottom: spacing.sm },
  appHeader:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  appType:      { fontSize: typography.sm, lineHeight: 19 },
  appStatsRow:  { flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs },
  appStat:      { flex: 1, alignItems: 'center', gap: 2 },
  appStatVal:   { fontSize: typography['2xl'], fontWeight: typography.black, letterSpacing: -0.5 },
  appStatLabel: { fontSize: typography.xs },
  appTrack:     { height: 6, borderRadius: 3, overflow: 'hidden', marginTop: spacing.sm },
  appFill:      { height: '100%', borderRadius: 3 },
  appDecision:  { fontSize: typography.sm, lineHeight: 20, marginTop: spacing.xs },
  appProgressRow:  { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs },
  appProgressText: { fontSize: typography.xs, fontWeight: typography.medium },

  overdueRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs,
                 borderRadius: borderRadius.md, padding: spacing.sm, marginTop: spacing.xs },
  overdueText: { flex: 1, fontSize: typography.xs, lineHeight: 17, fontWeight: typography.semibold },
  appInfoBox:   { borderTopWidth: StyleSheet.hairlineWidth, marginTop: spacing.sm,
                  paddingTop: spacing.sm, gap: spacing.xs },
  appInfoRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
  appInfoText:  { flex: 1, fontSize: typography.xs, lineHeight: 17 },
  appNote:      { fontSize: typography.xs, lineHeight: 16, marginTop: 2 },

  // Recent draws
  recentCard:        { paddingVertical: 0, paddingHorizontal: 0, overflow: 'hidden' },
  recentRow:         { flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
                       paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.base },
  recentDot:         { width: 7, height: 7, borderRadius: 4, marginTop: 2 },
  recentInfo:        { flex: 1, gap: 2 },
  recentTopLine:     { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  recentNum:         { fontSize: typography.xs, fontWeight: typography.semibold },
  recentCat:         { fontSize: typography.sm, fontWeight: typography.semibold },
  recentMeta:        { fontSize: typography.xs, lineHeight: 16 },
  recentRight:       { alignItems: 'flex-end', gap: 1 },
  recentCutoffLabel: { fontSize: 9, fontWeight: typography.bold, letterSpacing: 0.6 },
  recentCutoff:      { fontSize: typography.lg, fontWeight: typography.black, letterSpacing: -0.5 },
  recentDivider:     { height: StyleSheet.hairlineWidth, marginHorizontal: spacing.base },

  // Shared
  sectionBlock:    { gap: spacing.sm, marginBottom: spacing.sm },
  sectionHeader:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle:    { fontSize: typography.base, fontWeight: typography.bold },
  sinceChip:       { flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
                     paddingHorizontal: spacing.sm, paddingVertical: spacing.xs,
                     borderRadius: borderRadius.md },
  sinceChipLabel:  { fontSize: typography.xs, fontWeight: typography.semibold },
  sinceChipValue:  { fontSize: typography.xs, fontWeight: typography.medium },
  drawDivider:  { width: 1, height: 28 },

});
