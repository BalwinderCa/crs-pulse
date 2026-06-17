import { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useProfileStore } from '@/store/profileStore';
import { useDrawsStore } from '@/store/drawsStore';
import { useApplicationStore } from '@/store/applicationStore';
import { findApplicationType } from '@/features/tracker/data/processingTimes';
import { useProcessingTimes } from '@/features/tracker/hooks/useProcessingTimes';
import { Card } from '@/components/common/Card';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { AppHeader } from '@/components/layout/AppHeader';
import { palette, spacing, typography, borderRadius } from '@/theme';
import { useColors } from '@/hooks/useColors';
import { useAccentColor } from '@/hooks/useAccentColor';
import { CATEGORY_LABELS } from '@/constants';
import type { RootStackParamList } from '@/types';

const DAY_MS = 86_400_000;

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / DAY_MS);
}

export default function HomeScreen() {
  const c = useColors();
  const accent = useAccentColor();
  const stackNav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const profile = useProfileStore((s) => s.profile);
  const { draws, isRefreshing, refresh } = useDrawsStore();
  const application = useApplicationStore((s) => s.application);
  const { categories, updatedLabel } = useProcessingTimes();

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

  // Latest draw matching the user's program (FSW draws publish as General, FST as Trades)
  const drawCat = cat === 'FSW' ? 'General' : cat === 'FST' ? 'Trades' : cat;
  const myDraw = useMemo(
    () => draws.find((d) => d.category === drawCat) ?? draws[0] ?? null,
    [draws, drawCat],
  );
  const delta = scoreReady && myDraw ? score - myDraw.cutoff_score : null;
  const deltaColor = delta === null ? c.textMuted : delta >= 0 ? palette.success : palette.danger;

  return (
    <ScreenWrapper scrollable refreshing={isRefreshing} onRefresh={refresh}>
      <AppHeader title="Home" />

      {/* Score hero */}
      <Card style={s.heroCard}>
        {scoreReady ? (
          <>
            <View style={s.heroTop}>
              <View>
                <Text style={[s.heroLabel, { color: c.textMuted }]}>YOUR CRS SCORE</Text>
                <Text style={[s.heroScore, { color: c.textPrimary }]}>{score}</Text>
              </View>
              <View style={[s.catBadge, { backgroundColor: accent + '18', borderColor: accent + '30' }]}>
                <Text style={[s.catText, { color: accent }]}>{cat}</Text>
              </View>
            </View>
            {delta !== null && myDraw && (
              <View style={[s.deltaRow, { backgroundColor: deltaColor + '14' }]}>
                <Ionicons
                  name={delta >= 0 ? 'trending-up' : 'trending-down'}
                  size={16}
                  color={deltaColor}
                />
                <Text style={[s.deltaText, { color: deltaColor }]}>
                  {delta >= 0 ? `${delta} points above` : `${Math.abs(delta)} points below`} the latest{' '}
                  {CATEGORY_LABELS[myDraw.category] ?? myDraw.category} cutoff ({myDraw.cutoff_score})
                </Text>
              </View>
            )}
            <TouchableOpacity
              style={[s.calcLink, { borderTopColor: c.border }]}
              onPress={() => stackNav.navigate('Calculators')}
              activeOpacity={0.65}
            >
              <Ionicons name="calculator-outline" size={15} color={accent} />
              <Text style={[s.calcLinkText, { color: accent }]}>Calculate your score</Text>
              <Ionicons name="chevron-forward" size={14} color={c.textMuted} />
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={s.setupRow} onPress={() => stackNav.navigate('Calculators')} activeOpacity={0.7}>
            <View style={[s.setupIcon, { backgroundColor: accent + '18' }]}>
              <Ionicons name="calculator-outline" size={22} color={accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.setupTitle, { color: c.textPrimary }]}>Calculate your score</Text>
              <Text style={[s.setupSub, { color: c.textSecondary }]}>
                CRS, SINP and more points calculators
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
          </TouchableOpacity>
        )}
      </Card>

      {/* My application tracker */}
      {tracked ? (
        <Card style={s.appCard}>
          <View style={s.appHeader}>
            <Text style={[s.sectionTitle, { color: c.textPrimary }]}>My Application</Text>
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
                  <Text style={[s.appStatLabel, { color: c.textMuted }]}>Days since applied</Text>
                </View>
                <View style={[s.drawDivider, { backgroundColor: c.border }]} />
                <View style={s.appStat}>
                  <Text style={[s.appStatVal, { color: tracked.progress >= 1 ? palette.warning : accent }]}>
                    {Math.max(0, Math.ceil((tracked.totalDays - (tracked.daysIn ?? 0)) / 30.44))}
                  </Text>
                  <Text style={[s.appStatLabel, { color: c.textMuted }]}>Months left (est.)</Text>
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
                  Applied {tracked.applied.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}
                </Text>
                <Text style={[s.appProgressText, { color: c.textMuted }]}>
                  {Math.min(100, Math.round(tracked.progress * 100))}% of typical time
                </Text>
              </View>

              {tracked.progress >= 1 ? (
                <View style={[s.overdueRow, { backgroundColor: palette.warning + '14' }]}>
                  <Ionicons name="alert-circle-outline" size={15} color={palette.warning} />
                  <Text style={[s.overdueText, { color: palette.warning }]}>
                    Past typical processing time. Check your IRCC account, or contact IRCC via
                    webform if you have not heard anything.
                  </Text>
                </View>
              ) : (
                <Text style={[s.appDecision, { color: c.textSecondary }]}>
                  Estimated decision:{' '}
                  <Text style={{ color: accent, fontWeight: typography.bold }}>
                    {tracked.decisionDate.toLocaleDateString('en-CA', { month: 'long', year: 'numeric' })}
                  </Text>
                </Text>
              )}
            </>
          ) : (
            <Text style={[s.appDecision, { color: c.textSecondary }]}>
              Not submitted yet · typical processing ~{tracked.type.months} months.{' '}
              Tap the pencil to set your application date once you apply.
            </Text>
          )}

          <View style={[s.appInfoBox, { borderTopColor: c.border }]}>
            {tracked.type.peopleWaiting != null && (
              <View style={s.appInfoRow}>
                <Ionicons name="people-outline" size={14} color={c.textMuted} />
                <Text style={[s.appInfoText, { color: c.textSecondary }]}>
                  About {tracked.type.peopleWaiting.toLocaleString()} people waiting for a decision
                </Text>
              </View>
            )}
            {tracked.type.peopleWaiting != null && (
              <View style={s.appInfoRow}>
                <Ionicons name="speedometer-outline" size={14} color={c.textMuted} />
                <Text style={[s.appInfoText, { color: c.textSecondary }]}>
                  ≈{Math.round(tracked.type.peopleWaiting / tracked.type.months).toLocaleString()}{' '}
                  decisions per month at the current pace
                </Text>
              </View>
            )}
            <View style={s.appInfoRow}>
              <Ionicons name="hourglass-outline" size={14} color={c.textMuted} />
              <Text style={[s.appInfoText, { color: c.textSecondary }]}>
                People applying now should be processed in about {tracked.type.months}{' '}
                {tracked.type.months === 1 ? 'month' : 'months'}
                {tracked.type.varies ? ' (varies by case)' : ''}
              </Text>
            </View>
            <View style={s.appInfoRow}>
              <Ionicons name="refresh-outline" size={14} color={c.textMuted} />
              <Text style={[s.appInfoText, { color: c.textMuted }]}>
                Last updated {updatedLabel} · updated monthly
              </Text>
            </View>
            <Text style={[s.appNote, { color: c.textMuted }]}>
              Processing times may increase if more people apply than spaces available under the
              Immigration Levels Plan. Estimates are not a maximum or a guarantee.
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
              <Text style={[s.setupTitle, { color: c.textPrimary }]}>Track your application</Text>
              <Text style={[s.setupSub, { color: c.textSecondary }]}>
                Applied to IRCC? See your estimated decision date
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
          </TouchableOpacity>
        </Card>
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

  // Shared
  sectionTitle: { fontSize: typography.base, fontWeight: typography.bold },
  drawDivider:  { width: 1, height: 28 },

});
