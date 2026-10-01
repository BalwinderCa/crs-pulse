import { useMemo } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { format, parseISO, differenceInCalendarDays } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
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
  Managers: palette.purple,
  Transport: palette.orange,
};
import { useColors } from '@/hooks/useColors';
import { useAccentColor } from '@/hooks/useAccentColor';
import type { RootStackParamList, MainTabParamList } from '@/types';

const DAY_MS = 86_400_000;

// Whole calendar days from `a` to `b` (today → 0), timezone-safe.
function daysBetween(a: Date, b: Date): number {
  return differenceInCalendarDays(b, a);
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
  const history = useApplicationStore((s) => s.history);
  const removePast = useApplicationStore((s) => s.removePast);
  const confirmRemovePast = (index: number) =>
    Alert.alert(t('home.removePastTitle'), t('home.removePastMsg'), [
      { text: t('home.removePastCancel'), style: 'cancel' },
      { text: t('home.removePastConfirm'), style: 'destructive', onPress: () => { removePast(index); } },
    ]);
  const { categories, updatedLabel } = useProcessingTimes();
  const milestones = useTimelineStore((s) => s.milestones);
  const lastMilestone = milestones.length > 0 ? milestones[milestones.length - 1] : null;

  // "Today" / "1 day ago" / "N days ago" from a YYYY-MM-DD string (timezone-safe).
  const relativeDays = (iso: string): string => {
    const d = daysBetween(parseISO(iso.slice(0, 10)), new Date());
    if (d <= 0) return t('home.today');
    if (d === 1) return t('home.dayAgo');
    return t('home.daysAgo', { days: d });
  };
  const lastMilestoneLabel = lastMilestone
    ? (lastMilestone.type === 'Custom' ? (lastMilestone.customLabel ?? 'Custom') : lastMilestone.type)
    : null;

  // A logged Final Decision (and a COPR custom milestone) end the estimate: once
  // IRCC has decided, the card reports what happened instead of predicting it.
  const decision = useMemo(() => {
    const finals = milestones.filter((m) => m.type === 'Final Decision');
    const final = finals.length ? finals[finals.length - 1] : null;
    const coprs = milestones.filter((m) => m.type === 'Custom' && /copr/i.test(m.customLabel ?? ''));
    const copr = coprs.length ? coprs[coprs.length - 1] : null;
    return final ? { date: parseISO(final.date), copr: copr ? parseISO(copr.date) : null } : null;
  }, [milestones]);

  // Tracked application → progress vs typical IRCC processing time
  const tracked = useMemo(() => {
    if (!application) return null;
    const found = findApplicationType(application.categoryId, application.typeId, categories);
    if (!found) return null;
    const totalDays = Math.round(found.type.months * 30.44);
    if (!application.appliedDate) {
      return { ...found, applied: null, daysIn: null, totalDays, progress: 0, decisionDate: null, decided: false as const, copr: null };
    }
    const applied = parseISO(application.appliedDate);
    if (decision && decision.date >= applied) {
      const daysIn = daysBetween(applied, decision.date);
      return { ...found, applied, daysIn, totalDays, progress: Math.min(1, daysIn / totalDays), decisionDate: decision.date, decided: true as const, copr: decision.copr };
    }
    const daysIn = Math.max(0, daysBetween(applied, new Date()));
    const decisionDate = new Date(applied.getTime() + totalDays * DAY_MS);
    return {
      ...found,
      applied,
      daysIn,
      totalDays,
      progress: Math.min(1, daysIn / totalDays),
      decisionDate,
      decided: false as const,
      copr: null,
    };
  }, [application, categories, decision]);

  const score = profile?.crs_score ?? 0;
  const scoreReady = score > 0;
  const cat = profile?.category ?? 'General';
  const dateLocale = profile?.language === 'fr' ? fr : enUS;


  return (
    <ScreenWrapper
      scrollable
      refreshing={isRefreshing}
      onRefresh={refresh}
      header={<AppHeader title={t('home.title')} />}
    >
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
            <TouchableOpacity ph-label="home-calculate-crs"
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
          <TouchableOpacity ph-label="home-setup-calculators" style={s.setupRow} onPress={() => stackNav.navigate('Calculators')} activeOpacity={0.7}>
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
            <TouchableOpacity ph-label="home-edit-application"
              onPress={() => stackNav.navigate('ApplicationSetup')}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={t('home.editApplication')}
            >
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
                  <Text style={[s.appStatLabel, { color: c.textMuted }]}>{t(tracked.decided ? 'home.daysToDecision' : 'home.daysSinceApplied')}</Text>
                </View>
                <View style={[s.drawDivider, { backgroundColor: c.border }]} />
                {tracked.decided ? (
                  <View style={s.appStat}>
                    <Text style={[s.appStatVal, { color: palette.success }]}>
                      {format(tracked.decisionDate, 'MMM d', { locale: dateLocale })}
                    </Text>
                    <Text style={[s.appStatLabel, { color: c.textMuted }]}>{t('home.decisionDate')}</Text>
                  </View>
                ) : (
                  <View style={s.appStat}>
                    <Text style={[s.appStatVal, { color: tracked.progress >= 1 ? palette.warning : accent }]}>
                      {/* from the published months, not the day-rounded total (2 months → 61 days → 2.004 → 3) */}
                      {Math.max(0, Math.ceil(tracked.type.months - (tracked.daysIn ?? 0) / 30.44 - 1e-9))}
                    </Text>
                    <Text style={[s.appStatLabel, { color: c.textMuted }]}>{t('home.monthsLeft')}</Text>
                  </View>
                )}
              </View>
              <View style={[s.appTrack, { backgroundColor: c.surfaceTertiary }]}>
                <View
                  style={[
                    s.appFill,
                    {
                      backgroundColor: tracked.decided ? palette.success : tracked.progress >= 1 ? palette.warning : accent,
                      width: tracked.decided ? '100%' : `${Math.min(100, Math.round(tracked.progress * 100))}%`,
                    },
                  ]}
                />
              </View>
              <View style={s.appProgressRow}>
                <Text style={[s.appProgressText, { color: c.textMuted }]}>
                  {t('home.appliedOn')}{' '}
                  {format(tracked.applied, 'MMM d, yyyy', { locale: dateLocale })}
                </Text>
                <Text style={[s.appProgressText, { color: c.textMuted }]}>
                  {tracked.decided
                    ? t('home.decidedPercent', { percent: Math.round(((tracked.daysIn ?? 0) / tracked.totalDays) * 100) })
                    : t('home.typicalPercent', { percent: Math.min(100, Math.round(tracked.progress * 100)) })}
                </Text>
              </View>

              {tracked.decided ? (
                <View style={[s.overdueRow, { backgroundColor: palette.success + '14' }]}>
                  <Ionicons name="checkmark-circle" size={15} color={palette.success} />
                  <Text style={[s.overdueText, { color: palette.success }]}>
                    {tracked.copr
                      ? t('home.coprReceived', { date: format(tracked.copr, 'MMM d, yyyy', { locale: dateLocale }) })
                      : t('home.decisionReceived', { date: format(tracked.decisionDate, 'MMM d, yyyy', { locale: dateLocale }) })}
                  </Text>
                </View>
              ) : null}
              {tracked.decided ? (
                <TouchableOpacity ph-label="home-track-next"
                  style={[s.nextBtn, { borderColor: accent + '55', backgroundColor: accent + '0D' }]}
                  onPress={() => stackNav.navigate('ApplicationSetup', {
                    next: true,
                    decidedDate: format(tracked.decisionDate, 'yyyy-MM-dd'),
                    coprDate: tracked.copr ? format(tracked.copr, 'yyyy-MM-dd') : null,
                  })}
                  accessibilityRole="button"
                  accessibilityLabel={t('home.trackNext')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add-circle-outline" size={20} color={accent} />
                  <View style={{ flex: 1 }}>
                    <Text style={[s.nextTitle, { color: accent }]}>{t('home.trackNext')}</Text>
                    <Text style={[s.nextHint, { color: c.textMuted }]}>{t('home.trackNextHint')}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={accent} />
                </TouchableOpacity>
              ) : tracked.progress >= 1 ? (
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
                    {format(tracked.decisionDate, 'MMMM yyyy', { locale: dateLocale })}
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
          <TouchableOpacity ph-label="home-setup-application"
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

      {/* Decided applications filed away when the user moved on to the next one */}
      {history.length > 0 && (
        <Card style={s.appCard}>
          <Text style={[s.sectionTitle, { color: c.textPrimary }]}>{t('home.previousApplications')}</Text>
          {history.map((h, i) => {
            const found = findApplicationType(h.categoryId, h.typeId, categories);
            const outcome = h.coprDate
              ? t('home.pastCopr', { date: format(parseISO(h.coprDate), 'MMM d, yyyy', { locale: dateLocale }) })
              : h.decidedDate
                ? t('home.pastDecided', { date: format(parseISO(h.decidedDate), 'MMM d, yyyy', { locale: dateLocale }) })
                : null;
            return (
              <View key={`${h.typeId}-${h.appliedDate ?? i}`} style={[s.pastRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border }]}>
                <Ionicons name="checkmark-circle" size={18} color={palette.success} />
                <View style={{ flex: 1 }}>
                  <Text style={[s.pastTitle, { color: c.textPrimary }]}>{found?.type.label ?? h.typeId}</Text>
                  {outcome && <Text style={[s.pastSub, { color: c.textMuted }]}>{outcome}</Text>}
                </View>
                <TouchableOpacity ph-label="home-remove-previous"
                  onPress={() => confirmRemovePast(i)}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel={t('home.removePastLabel', { name: found?.type.label ?? h.typeId })}
                >
                  <Ionicons name="close" size={18} color={c.textMuted} />
                </TouchableOpacity>
              </View>
            );
          })}
        </Card>
      )}

      {/* Timeline peek */}
      <Card style={s.appCard}>
        <TouchableOpacity ph-label="home-open-timeline"
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
                {t('home.lastMilestone', { rel: relativeDays(lastMilestone.date) })}
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
                  {relativeDays(draws[0].date)}
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
                      {draw.invitations_issued.toLocaleString()} {t('home.invited')} · {format(parseISO(draw.date.slice(0, 10)), 'MMM d, yyyy')}
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
  nextBtn:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm,
                 paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: borderRadius.md, borderWidth: 1 },
  nextTitle:   { fontSize: typography.sm, fontWeight: typography.bold },
  nextHint:    { fontSize: typography.xs, marginTop: 1 },
  pastRow:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  pastTitle:   { fontSize: typography.sm, fontWeight: typography.semibold },
  pastSub:     { fontSize: typography.xs, marginTop: 1 },
  appInfoBox:   { borderTopWidth: StyleSheet.hairlineWidth, marginTop: spacing.sm,
                  paddingTop: spacing.sm, gap: spacing.xs },
  appInfoRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
  appInfoText:  { flex: 1, fontSize: typography.xs, lineHeight: 17 },
  appNote:      { fontSize: typography.xs, lineHeight: 16, marginTop: 2 },

  // Recent draws
  recentCard:        { paddingVertical: 0, paddingHorizontal: 0, overflow: 'hidden' },
  recentRow:         { flexDirection: 'row', alignItems: 'center', gap: spacing.md,
                       paddingVertical: spacing.base, paddingHorizontal: spacing.base },
  recentDot:         { width: 10, height: 10, borderRadius: 5, marginTop: 2 },
  recentInfo:        { flex: 1, gap: 4 },
  recentTopLine:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  recentNum:         { fontSize: typography.sm, fontWeight: typography.semibold },
  recentCat:         { fontSize: typography.base, fontWeight: typography.semibold },
  recentMeta:        { fontSize: typography.sm, lineHeight: 18 },
  recentRight:       { alignItems: 'flex-end', gap: 2 },
  recentCutoffLabel: { fontSize: 10, fontWeight: typography.bold, letterSpacing: 0.6 },
  recentCutoff:      { fontSize: typography['2xl'], fontWeight: typography.black, letterSpacing: -0.5 },
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
