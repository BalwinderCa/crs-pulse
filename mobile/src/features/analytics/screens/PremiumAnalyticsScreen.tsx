import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useDrawsStore } from '@/store/drawsStore';
import { usePremiumStore } from '@/store/premiumStore';
import { MONETIZATION_ENABLED } from '@/constants';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/types';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/layout/AppHeader';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { AdBanner } from '@/components/common/AdBanner';
import { palette, spacing, typography, borderRadius } from '@/theme';
import { useColors } from '@/hooks/useColors';
import type { Colors } from '@/theme/colors';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useTabBarLayout } from '@/hooks/useTabBarLayout';
import { OddsGauge, ForecastBandChart, MiniBars, MarkerBar, HorizontalBars, TrendLineChart } from '../components/PremiumCharts';
import { useAnalyticsData } from '../hooks/useAnalyticsData';
import { useProfileStore, DEFAULT_CALC_INPUTS, type CalcInputs } from '@/store/profileStore';
import { useProcessingTimesStore } from '@/store/processingTimesStore';
import { useEePoolStore } from '@/store/eePoolStore';
import { buildCRSInput, LANG_TEST_MAP } from '@/features/onboarding/utils/buildCRSInput';
import { calculateCRS, scoresToCLB, type TefScale } from '@/features/onboarding/utils/crsCalculator';


import i18n from '@/i18n';

const ODDS_COLOR: Record<string, string> = { High: palette.success, Moderate: palette.warning, Low: palette.danger };
const fmt = (n: number) => n.toLocaleString(i18n.language === 'fr' ? 'fr-CA' : 'en-CA');

type TabKey = 'draws' | 'plan';

export default function PremiumAnalyticsScreen() {
  const { t } = useTranslation();
  const c = useColors();
  const accent = useAccentColor();
  const { width: windowWidth } = useWindowDimensions();
  const { contentPaddingBottom } = useTabBarLayout();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [tab, setTab] = useState<TabKey>('draws');
  const data = useAnalyticsData();
  const isPremium = usePremiumStore((s) => s.isPremium);
  const premiumLoaded = usePremiumStore((s) => s.loaded);
  const billingAvailable = usePremiumStore((s) => s.billingAvailable);

  // Freemium model: the Draws tab (live IRCC market + history) is free forever;
  // the "Your Plan" tab (next-draw prediction, improvement plan, what-if,
  // forecast, percentile, decision outlook) is the one-time unlock. Fails OPEN
  // when billing is unavailable (iOS without StoreKit, emulator, or a transient
  // outage) — never show a lock the user can't buy through. A CRS score is
  // required for any analytics (everything is personalised to it).
  const planLocked = MONETIZATION_ENABLED && premiumLoaded && !isPremium && billingAvailable;
  const noProfile = data.userScore === 0;
  const showPlan = tab === 'plan';

  // After a successful purchase/restore this session, reveal the plan the user
  // just unlocked (the Paywall closes itself once the entitlement is granted).
  const wasPremium = useRef(isPremium);
  useEffect(() => {
    if (isPremium && !wasPremium.current) setTab('plan');
    wasPremium.current = isPremium;
  }, [isPremium]);

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'draws', label: t('analytics.drawsTab') },
    { key: 'plan', label: t('analytics.yourPlanTab') },
  ];

  // Refresh draws when the tab regains focus. load() is cache-first and
  // staleness-guarded (returns early if <1h old), so this is cheap and only
  // hits the IRCC feed when the data is actually stale.
  const loadDraws = useDrawsStore((s) => s.load);
  const loadPool = useEePoolStore((s) => s.load);
  const loadProcTimes = useProcessingTimesStore((s) => s.load);
  useFocusEffect(
    useCallback(() => {
      loadDraws().catch(() => {});
      loadPool().catch(() => {});
      loadProcTimes().catch(() => {});
    }, [loadDraws, loadPool, loadProcTimes]),
  );

  // ── What-if: a REAL CRS recompute via the official calculator ──
  // Anchored to the user's saved profile. The controls START at the user's real
  // values (so the untouched baseline equals their actual CRS) and each override
  // is applied ONLY once that control is moved off its profile value — otherwise
  // forcing a uniform CLB would drop a 539 to ~530 before the user touches anything.
  const baseInputs = useProfileStore((s) => s.profile?.calculatorInputs) ?? DEFAULT_CALC_INPUTS;

  // The user's representative first-language level = the lowest of their four
  // per-skill CLBs (the binding skill for CRS), clamped to the slider's 4–10 range.
  const profileClb = useMemo(() => {
    const test = LANG_TEST_MAP[baseInputs.firstLangTest] ?? 'IELTS';
    const clbs = scoresToCLB(
      test,
      {
        speaking: Number(baseInputs.firstLangSpeaking) || 0,
        listening: Number(baseInputs.firstLangListening) || 0,
        reading: Number(baseInputs.firstLangReading) || 0,
        writing: Number(baseInputs.firstLangWriting) || 0,
      },
      (baseInputs.tefScale ?? 'current') as TefScale,
    );
    const minClb = Math.min(clbs.speaking, clbs.listening, clbs.reading, clbs.writing);
    return Math.min(10, Math.max(4, minClb || 9));
  }, [baseInputs]);

  const [age, setAge] = useState(() => baseInputs.age || 30);
  const [clb, setClb] = useState(profileClb);
  const [french, setFrench] = useState(baseInputs.hasSecondLang);
  const [pnp, setPnp] = useState(baseInputs.hasProvincialNomination);

  const whatIfScore = useMemo(() => {
    const langChanged = clb !== profileClb;
    const frenchChanged = french !== baseInputs.hasSecondLang;
    const di: CalcInputs = {
      ...baseInputs,
      age,
      hasProvincialNomination: pnp,
      // Only flatten the first language to a uniform CLB once the slider moves —
      // otherwise keep the real per-skill scores so the baseline matches the profile.
      ...(langChanged
        ? {
            firstLangTest: 'CLB',
            firstLangSpeaking: clb, firstLangListening: clb, firstLangReading: clb, firstLangWriting: clb,
          }
        : {}),
      // French toggle overrides only when flipped from the user's real status.
      // NCLC 7 thresholds on the TCF scale trigger the French bonus correctly.
      ...(frenchChanged
        ? french
          ? {
              hasSecondLang: true,
              secondLangTest: 'TCF',
              secondLangSpeaking: 10, secondLangListening: 458, secondLangReading: 453, secondLangWriting: 10,
            }
          : { hasSecondLang: false }
        : {}),
    };
    return calculateCRS(buildCRSInput(di)).total;
  }, [baseInputs, age, clb, french, pnp, profileClb]);
  const whatIfLabel = whatIfScore - data.trendCutoff >= 10 ? 'High' : whatIfScore - data.trendCutoff >= -10 ? 'Moderate' : 'Low';

  const oddsColor = ODDS_COLOR[data.oddsLabel] ?? palette.warning;
  const chartWidth = Math.max(220, Math.min(300, windowWidth - spacing.base * 4));

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.surfacePrimary }]} edges={['top', 'left', 'right']}>
      <View style={s.header}>
        <AppHeader title={t('analytics.title')} />
      </View>

      <View style={s.bodyWrap}>
      <ScrollView
        contentContainerStyle={[s.body, { paddingBottom: contentPaddingBottom }]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!noProfile}
      >
        {/* Pinned odds hero */}
        <Card style={[s.card, { borderTopWidth: 2, borderTopColor: accent }]}>
          <Text style={[s.kicker, { color: c.textMuted }]}>{t('analytics.yourOdds')} · {data.category}</Text>
          <View style={s.gaugeWrap}>
            <OddsGauge
              fraction={data.oddsFraction}
              color={oddsColor}
              track={c.surfaceTertiary}
              accessibilityLabel={t('premiumCharts.oddsAccessibility', {
                label: data.oddsLabel,
                score: data.userScore,
                cutoff: data.trendCutoff,
                timeframe: data.timeframe,
              })}
            />
            <View style={s.gaugeCenter}>
              <Text style={[s.oddsLabel, { color: oddsColor }]}>{data.oddsLabel}</Text>
              <Text style={[s.oddsTime, { color: c.textSecondary }]}>{data.timeframe}</Text>
            </View>
          </View>
          <View style={[s.compareRow, { borderTopColor: c.border }]}>
            <Text style={[s.compareText, { color: c.textSecondary }]}>{t('analytics.yourLabel')} <Text style={[s.num, { color: c.textPrimary }]}>{data.userScore}</Text></Text>
            <View style={[s.vDiv, { backgroundColor: c.border }]} />
            <Text style={[s.compareText, { color: c.textSecondary }]}>{t('analytics.trendCutoffLabel')} <Text style={[s.num, { color: c.textPrimary }]}>~{data.trendCutoff}</Text></Text>
          </View>
        </Card>

        {/* Section tabs */}
        <View style={[s.segWrap, { backgroundColor: c.surfaceSecondary, borderColor: c.border }]}>
          {TABS.map((t) => {
            const active = tab === t.key;
            const showLock = t.key === 'plan' && planLocked;
            return (
              <TouchableOpacity
                key={t.key}
                style={[s.segBtn, active && { backgroundColor: accent }]}
                onPress={() => setTab(t.key)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <View style={s.segLabelRow}>
                  <Text style={[s.segText, { color: active ? palette.white : c.textSecondary }]}>{t.label}</Text>
                  {showLock && <Ionicons name="lock-closed" size={11} color={active ? palette.white : c.textMuted} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {showPlan ? (
          planLocked ? (
            <PlanTabSkeleton c={c} accent={accent} userScore={data.userScore} />
          ) : (
            <PlanTab
              c={c} accent={accent} data={data}
              chartWidth={chartWidth}
              age={age} setAge={setAge} clb={clb} setClb={setClb}
              french={french} setFrench={setFrench} pnp={pnp} setPnp={setPnp}
              whatIfScore={whatIfScore} whatIfLabel={whatIfLabel}
            />
          )
        ) : (
          <DrawsTab c={c} accent={accent} data={data} chartWidth={chartWidth} />
        )}

        <Text style={[s.disclaimer, { color: c.textMuted }]}>
          {t('premiumCharts.disclaimer')}
        </Text>
      </ScrollView>

        {/*
          Only the "add your CRS score" gate is a full-screen overlay now — a
          score is required for any analytics. The paid Improve tab gates itself
          inline (ImproveUpsell) so Operations + Trends stay free and usable.
        */}
        {noProfile && (
          <View style={[s.lockOverlay, { backgroundColor: c.surfacePrimary + 'E6' }]}>
            <Card style={[s.lockCard, { borderColor: accent }]}>
              <View style={[s.lockIcon, { backgroundColor: accent + '1A' }]}>
                <Ionicons name="lock-closed" size={26} color={accent} />
              </View>
              <Text style={[s.lockTitle, { color: c.textPrimary }]}>{t('analytics.completeCrsTitle')}</Text>
              <Text style={[s.lockBody, { color: c.textSecondary }]}>
                {t('analytics.completeCrsBody')}
              </Text>
              <Button
                title={t('analytics.calculateCrs')}
                fullWidth
                icon={<Ionicons name="calculator-outline" size={18} color={palette.white} />}
                onPress={() => nav.navigate('CrsCalculator')}
                style={s.lockBtn}
              />
            </Card>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

// ─── Draws tab (free: live IRCC market data + history) ────────────────────────
function DrawsTab({ c, accent, data, chartWidth }: any) {
  const { t } = useTranslation();
  const i = data.ircc;
  return (
    <>
      {/* Free teaser: where your score sits vs the live cutoff trend */}
      <Card style={s.card}>
        <Text style={[s.kicker, { color: c.textMuted }]}>{t('analytics.cutoffVsScore', { count: data.trend.length })}</Text>
        <TrendLineChart
          series={[{ points: data.trend, color: accent }]}
          min={data.selfTrendMin} max={data.selfTrendMax}
          gridColor={c.border} axisColor={c.textMuted}
           refLine={{ value: data.userScore, color: palette.success, label: t('premiumCharts.youLabel', { score: data.userScore }) }}
          width={chartWidth} height={150}
          accessibilityLabel={t('premiumCharts.trendAccessibility', {
            count: data.trend.length,
            min: data.selfTrendMin,
            max: data.selfTrendMax,
            score: data.userScore,
          })}
        />
        <Text style={[s.caption, { color: c.textMuted }]}>{t('analytics.clearDrawLegend')}</Text>
      </Card>

      <Card style={s.card}>
        <Text style={[s.kicker, { color: c.textMuted }]}>{t('analytics.invitationsPace', { year: i.curYear })}</Text>
        <View style={s.rowBetween}>
          <Text style={[s.opsBig, { color: c.textPrimary }]}>{fmt(i.itaYtd)}</Text>
          <Text style={[s.caption, { color: c.textSecondary }]}>{t('analytics.itasYtd')}</Text>
        </View>
        <View style={[s.progressTrack, { backgroundColor: c.surfaceTertiary }]}>
          <View style={[s.progressFill, { backgroundColor: accent, width: `${Math.min(100, Math.round((i.itaYtd / Math.max(1, i.itaProjected)) * 100))}%` }]} />
        </View>
        <Text style={[s.caption, { color: c.textMuted }]}>
          {t('premiumCharts.projectedText', {
            projected: fmt(i.itaProjected),
            prevYear: i.prevYear,
            prevYearItas: fmt(i.itaPrevYear),
            prTarget: fmt(i.prTarget),
          })}
        </Text>
      </Card>

      <Card style={s.card}>
        <Text style={[s.kicker, { color: c.textMuted }]}>{t('analytics.poolComposition')}</Text>
        <View style={{ marginTop: spacing.xs }}>
          <HorizontalBars track={c.surfaceTertiary} labelColor={c.textSecondary} valueColor={c.textPrimary}
            items={i.poolComposition.map((p: any) => ({
              label: p.label + (p.mine ? '  ' + t('premiumCharts.directionYou') : ''), value: p.value,
              max: Math.max(...i.poolComposition.map((x: any) => x.value)),
              color: p.mine ? accent : c.textMuted, highlight: !!p.mine,
            }))} />
        </View>
        <Text style={[s.caption, { color: c.textSecondary }]}>
          {t('premiumCharts.poolText', { total: fmt(i.poolTotal), asOf: i.poolAsOf })}
        </Text>
      </Card>

      <Card style={s.card}>
        <Text style={[s.kicker, { color: c.textMuted }]}>{t('analytics.itaMix', { year: i.curYear })}</Text>
        <View style={{ marginTop: spacing.xs }}>
          <HorizontalBars track={c.surfaceTertiary} labelColor={c.textSecondary} valueColor={c.textPrimary}
            items={i.categoryMix.map((m: any, idx: number) => ({ label: m.label, value: m.value, max: 40, suffix: '%', color: idx === 0 ? accent : c.textMuted }))} />
        </View>
      </Card>

      <Card style={s.card}>
        <Text style={[s.kicker, { color: c.textMuted }]}>{t('analytics.latestCutoff')}</Text>
        <View style={{ marginTop: spacing.xs }}>
          <HorizontalBars track={c.surfaceTertiary} labelColor={c.textSecondary} valueColor={c.textPrimary}
            items={i.categoryCutoffs.map((cc: any) => ({ label: cc.label, value: cc.value, max: 750, color: cc.label.startsWith('French') ? palette.success : accent, highlight: cc.label.startsWith('French') }))} />
        </View>
      </Card>

      <Card style={[s.card, { borderLeftWidth: 3, borderLeftColor: palette.success }]}>
        <Text style={[s.kicker, { color: c.textMuted }]}>{t('analytics.frenchAdvantage')}</Text>
        <Text style={[s.bodyText, { color: c.textPrimary }]}>
          {t('premiumCharts.frenchAdvantageText', {
            diff: Math.max(0, i.cecCutoff - i.frenchCutoff),
            frenchCutoff: i.frenchCutoff,
            cecCutoff: i.cecCutoff,
          })}
        </Text>
      </Card>

      <Card style={s.card}>
        <Text style={[s.kicker, { color: c.textMuted }]}>{t('analytics.drawSizeFreq')} · {i.curYear}</Text>
        <View style={s.statGrid}>
          <View style={s.statCell}><Text style={[s.opsBig, { color: c.textPrimary }]}>{i.avgSize}</Text><Text style={[s.statCellLabel, { color: c.textMuted }]}>{t('analytics.avgPerDraw')}</Text></View>
          <View style={[s.vDivTall, { backgroundColor: c.border }]} />
          <View style={s.statCell}><Text style={[s.opsBig, { color: c.textPrimary }]}>{i.largest}</Text><Text style={[s.statCellLabel, { color: c.textMuted }]}>{t('analytics.largest')}</Text></View>
          <View style={[s.vDivTall, { backgroundColor: c.border }]} />
          <View style={s.statCell}><Text style={[s.opsBig, { color: c.textPrimary }]}>{i.drawsYtd}</Text><Text style={[s.statCellLabel, { color: c.textMuted }]}>{t('analytics.drawsYtd')}</Text></View>
        </View>
      </Card>

      <Card style={s.card}>
        <Text style={[s.kicker, { color: c.textMuted }]}>{t('analytics.tieBreak')}</Text>
        <Text style={[s.num, { color: c.textPrimary, fontSize: typography.base }]}>{i.tieBreak}</Text>
        <Text style={[s.caption, { color: c.textMuted }]}>
          {t('premiumCharts.tieBreakHint')}
        </Text>
      </Card>

      <Card style={s.card}>
        <Text style={[s.kicker, { color: c.textMuted }]}>{t('analytics.cutoffByCategoryTrend')}</Text>
        <TrendLineChart
          series={[
            { points: data.categoryTrends.CEC, color: accent },
            { points: data.categoryTrends.French, color: palette.success },
            { points: data.categoryTrends.PNP, color: palette.warning },
          ]}
          min={data.trendMin} max={data.trendMax}
          gridColor={c.border} axisColor={c.textMuted}
          width={chartWidth} height={150}
          accessibilityLabel={t('premiumCharts.categoryTrendAccessibility')}
        />
        <View style={s.legendRow}>
          {[['CEC', accent], ['French', palette.success], ['PNP', palette.warning]].map(([lbl, col]) => (
            <View key={lbl} style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: col as string }]} />
              <Text style={[s.legendText, { color: c.textSecondary }]}>{lbl}</Text>
            </View>
          ))}
        </View>
        <Text style={[s.caption, { color: c.textMuted }]}>
          {t('premiumCharts.categoryTrendLegend')}
        </Text>
      </Card>

      <Card style={s.card}>
        <Text style={[s.kicker, { color: c.textMuted }]}>{t('analytics.invitationsPerDraw', { count: data.invitationsTrend.length })}</Text>
        <TrendLineChart
          series={[{ points: data.invitationsTrend, color: palette.success, fill: palette.success + '22' }]}
          min={0} max={Math.max(1, ...data.invitationsTrend) * 1.1}
          gridColor={c.border} axisColor={c.textMuted}
          width={chartWidth} height={140}
          accessibilityLabel={t('premiumCharts.invitationsTrendAccessibility', { count: data.invitationsTrend.length })}
        />
        <Text style={[s.caption, { color: c.textMuted }]}>{t('analytics.itasEachRound')}</Text>
      </Card>

      <Card style={s.card}>
        <Text style={[s.kicker, { color: c.textMuted }]}>{t('analytics.drawsByMonth')}</Text>
        <MiniBars values={data.byMonth} color={accent} track={c.surfaceTertiary} width={chartWidth} height={48}
          accessibilityLabel={t('premiumCharts.byMonthAccessibility', {
            busiest: data.busiestMonth,
            quietest: data.quietestMonth,
          })} />
        <Text style={[s.caption, { color: c.textSecondary }]}>{t('premiumCharts.busiestQuietest', {
          busiest: data.busiestMonth,
          quietest: data.quietestMonth,
        })}</Text>
      </Card>

      <View style={s.miniRow}>
        <Card style={s.miniCard}>
          <Text style={[s.kicker, { color: c.textMuted }]}>{t('analytics.drawCadence')}</Text>
          <MiniBars values={data.cadence} color={accent} track={c.surfaceTertiary}
            accessibilityLabel={t('premiumCharts.cadenceAccessibility', { days: data.cadenceDays })} />
          <Text style={[s.caption, { color: c.textSecondary }]}>{t('analytics.everyPrefix')} <Text style={[s.num, { color: c.textPrimary }]}>{data.cadenceDays}</Text> {t('analytics.daysUnit')}</Text>
        </Card>
        <Card style={s.miniCard}>
          <Text style={[s.kicker, { color: c.textMuted }]}>{t('analytics.invitationsCaps')}</Text>
          <MiniBars values={data.volume} color={palette.success} track={c.surfaceTertiary}
            accessibilityLabel={t('premiumCharts.volumeAccessibility', { ytd: data.invitationsYtd })} />
          <Text style={[s.caption, { color: c.textSecondary }]}><Text style={[s.num, { color: c.textPrimary }]}>{data.invitationsYtd}</Text> {t('analytics.ytd')}</Text>
        </Card>
      </View>

      <Card style={s.card}>
        <View style={s.rowBetween}>
          <Text style={[s.kicker, { color: c.textMuted }]}>{t('analytics.cutoffMomentum')}</Text>
          <Text style={[s.num, { color: data.momentumDown ? palette.success : palette.danger }]}>
            {data.momentumDown ? t('analytics.trendingDown') : t('analytics.trendingUp')}
          </Text>
        </View>
        <View style={s.chipRow}>
          {data.momentum.map((d: number, idx: number) => (
            <View key={idx} style={[s.chip, { backgroundColor: (d <= 0 ? palette.success : palette.danger) + '18' }]}>
              <Text style={[s.chipText, { color: d <= 0 ? palette.success : palette.danger }]}>{d > 0 ? `+${d}` : d}</Text>
            </View>
          ))}
        </View>
        <Text style={[s.caption, { color: c.textMuted }]}>{t('analytics.fallingCutoffs', { count: data.avgInvitations })}</Text>
      </Card>

      <AdBanner />
    </>
  );
}

// ─── Your Plan tab (premium: personalised, predictive + prescriptive) ─────────
function PlanTab({ c, accent, data, chartWidth, age, setAge, clb, setClb, french, setFrench, pnp, setPnp, whatIfScore, whatIfLabel }: any) {
  const { t } = useTranslation();
  const i = data.ircc;
  return (
    <>
      <Card style={s.card}>
        <Text style={[s.kicker, { color: c.textMuted }]}>{t('analytics.nextDrawPredicted')}</Text>
        <View style={s.rowBetween}>
          <Text style={[s.opsBig, { color: c.textPrimary }]}>{i.nextDrawWindow}</Text>
          <View style={[s.tagPill, { backgroundColor: accent + '18' }]}>
            <Text style={[s.tagText, { color: accent }]}>{i.nextDrawLikely}</Text>
          </View>
        </View>
        <Text style={[s.caption, { color: c.textSecondary }]}>
          {t('premiumCharts.nextDrawText', {
            days: i.daysSinceLast,
            gap: i.avgGap,
            size: i.typicalSize,
          })}
        </Text>
      </Card>

      <Card style={s.card}>
        <View style={s.rowBetween}>
          <Text style={[s.kicker, { color: c.textMuted }]}>{t('analytics.howToImprove')}</Text>
          <Text style={[s.gapBadge, { color: accent }]}>{data.gapText}</Text>
        </View>
        {data.paths.length > 0 ? (
          data.paths.map((p: any, idx: number) => (
            <View key={p.label} style={[s.gapRow, idx > 0 && { borderTopColor: c.border, borderTopWidth: StyleSheet.hairlineWidth }]}>
              <Ionicons name="arrow-up-circle-outline" size={16} color={accent} />
              <Text style={[s.gapLabel, { color: c.textPrimary }]}>{p.label}</Text>
              <Text style={[s.gapDelta, { color: palette.success }]}>{p.delta}</Text>
            </View>
          ))
        ) : (
          <Text style={[s.bodyText, { color: c.textSecondary, marginTop: spacing.xs }]}>
            {t('premiumCharts.noProfilePaths')}
          </Text>
        )}
      </Card>

      <Card style={s.card}>
        <Text style={[s.kicker, { color: c.textMuted }]}>{t('analytics.forecast', { category: data.category.toUpperCase() })}</Text>
        <ForecastBandChart actual={data.forecast.actual} forecast={data.forecast.proj} band={data.forecast.band}
          min={data.forecast.min} max={data.forecast.max} lineColor={accent} bandColor={accent + '26'} gridColor={c.border}
          width={Math.min(280, chartWidth)}
          accessibilityLabel={t('premiumCharts.forecastAccessibility', {
            category: data.category,
            likely: data.forecast.likely,
            confidence: data.forecast.confidence.toLowerCase(),
          })} />
        <Text style={[s.caption, { color: c.textSecondary }]}>
          Likely <Text style={[s.num, { color: c.textPrimary }]}>{data.forecast.likely}</Text> · {t('analytics.confidence')} {data.forecast.confidence.toLowerCase()}
        </Text>
      </Card>

      <Card style={s.card}>
        <View style={s.rowBetween}>
          <Text style={[s.kicker, { color: c.textMuted }]}>{t('analytics.whatIf')}</Text>
          <Text style={[s.whatIfScore, { color: c.textPrimary }]}>CRS {whatIfScore}</Text>
        </View>
        <SliderRow c={c} accent={accent} label={t('analytics.whatIfAge')} value={age} min={18} max={45} step={1} onChange={setAge} display={String(age)} />
        <SliderRow c={c} accent={accent} label={t('analytics.whatIfLanguage')} value={clb} min={4} max={10} step={1} onChange={setClb} display={`CLB ${clb}`} />
        <SwitchRow c={c} accent={accent} label={t('analytics.whatIfFrench')} value={french} onChange={setFrench} />
        <SwitchRow c={c} accent={accent} label={t('analytics.whatIfPnp')} value={pnp} onChange={setPnp} />
        <View style={[s.whatIfOut, { backgroundColor: (ODDS_COLOR[whatIfLabel] ?? accent) + '14' }]}>
          <Text style={[s.whatIfOutText, { color: ODDS_COLOR[whatIfLabel] ?? accent }]}>{t('premiumCharts.whatIfOutText', { label: whatIfLabel })}</Text>
        </View>
      </Card>

      <Card style={s.card}>
        <Text style={[s.kicker, { color: c.textMuted }]}>{t('analytics.bestStream')}</Text>
        {data.streams.map((st: any, idx: number) => (
          <View key={st.label} style={[s.bandRow, idx > 0 && { borderTopColor: c.border, borderTopWidth: StyleSheet.hairlineWidth }]}>
            <Text style={[s.bandScore, { color: idx === 0 ? accent : c.textPrimary, fontWeight: idx === 0 ? typography.bold : typography.medium }]}>{st.label}</Text>
            <Text style={[s.bandWait, { color: c.textSecondary }]}>
              {t('analytics.cutoff')} {st.cutoff}{'   '}
              <Text style={{ color: st.margin >= 0 ? palette.success : palette.danger, fontWeight: typography.bold }}>
                {st.margin >= 0 ? `+${st.margin}` : st.margin}
              </Text>
            </Text>
          </View>
        ))}
        <Text style={[s.caption, { color: c.textMuted }]}>{t('premiumCharts.streamLegend')}</Text>
      </Card>

      <Card style={s.card}>
        <Text style={[s.kicker, { color: c.textMuted }]}>{t('analytics.expectedWait')}</Text>
        {data.byScoreBand.map((r: any, idx: number) => {
          const mine = r.mine;
          return (
            <View key={r.band} style={[s.bandRow, idx > 0 && { borderTopColor: c.border, borderTopWidth: StyleSheet.hairlineWidth }]}>
              <Text style={[s.bandScore, { color: mine ? accent : c.textPrimary, fontWeight: mine ? typography.bold : typography.medium }]}>{r.band}{mine ? '  ← you' : ''}</Text>
              <Text style={[s.bandWait, { color: c.textSecondary }]}>{r.wait}</Text>
            </View>
          );
        })}
      </Card>

      <Card style={s.card}>
        <Text style={[s.kicker, { color: c.textMuted }]}>{t('analytics.vsRecentCutoffs')}</Text>
        <Text style={[s.bodyText, { color: c.textPrimary }]}>{t('premiumCharts.percentileText', { score: data.userScore, percentile: data.percentile })}</Text>
        <View style={{ marginTop: spacing.sm }}>
          <MarkerBar
            fraction={data.percentile / 100}
            color={accent}
            track={c.surfaceTertiary}
            accessibilityLabel={t('premiumCharts.markerBarAccessibility', { percentile: data.percentile })}
          />
        </View>
      </Card>

      <Card style={s.card}>
        <Text style={[s.kicker, { color: c.textMuted }]}>{t('analytics.whereYouStand')}</Text>
        <View style={{ marginTop: spacing.xs }}>
          <HorizontalBars track={c.surfaceTertiary} labelColor={c.textSecondary} valueColor={c.textPrimary}
            items={data.distribution.map((d: any) => ({ label: d.label + (d.mine ? '  ' + t('premiumCharts.directionYou') : ''), value: d.value, max: Math.max(1, ...data.distribution.map((x: any) => x.value)), color: d.mine ? accent : c.textMuted, highlight: !!d.mine }))} />
        </View>
      </Card>

      <Card style={s.card}>
        <Text style={[s.kicker, { color: c.textMuted }]}>{t('analytics.decisionOutlook', { category: data.category })}</Text>
        <View style={s.statGrid}>
          <View style={s.statCell}><Text style={[s.opsBig, { color: c.textPrimary }]}>~{i.estMonths}mo</Text><Text style={[s.statCellLabel, { color: c.textMuted }]}>{t('analytics.estDecision')}</Text></View>
          <View style={[s.vDivTall, { backgroundColor: c.border }]} />
          <View style={s.statCell}><Text style={[s.opsBig, { color: c.textPrimary }]}>{fmt(i.myInventory)}</Text><Text style={[s.statCellLabel, { color: c.textMuted }]}>{t('analytics.inInventory')}</Text></View>
        </View>
      </Card>

      <AdBanner />
    </>
  );
}

// ─── Your Plan skeleton (locked preview with shimmer + unlock CTA) ────────────
function PlanTabSkeleton({ c, accent, userScore }: { c: Colors; accent: string; userScore: number }) {
  const { t } = useTranslation();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const lv = () => (
    <View style={[s.lockVal, { backgroundColor: c.surfaceTertiary }]}>
      <Text style={[s.lockValText, { color: c.textMuted }]}>-</Text>
    </View>
  );

  const lb = (h: number) => (
    <View style={[s.lockBlock, { height: h, borderColor: c.border }]}>
      <Ionicons name="lock-closed" size={20} color={c.textMuted} />
      <Text style={[s.caption, { color: c.textMuted }]}>{t('analytics.unlockToView')}</Text>
    </View>
  );

  const IMPROVE_PATHS = [t('analytics.improveLanguage'), t('analytics.learnFrench'), t('analytics.getProvNom')];
  const STREAMS       = ['Canadian Experience Class', 'French Language', 'Provincial Nominee', 'RNIP / Agri-Food'];
  const SCORE_BANDS   = ['530\u2013559  \u2190 you', '500\u2013529', '470\u2013499', '440\u2013469', '< 440'];

  return (
    <>
      <Card style={[s.card, { borderWidth: 1, borderColor: accent }]}>
        <View style={[s.skimIcon, { backgroundColor: accent + '18' }]}>
          <Ionicons name="analytics-outline" size={24} color={accent} />
        </View>
        <Text style={[s.lockTitle, { color: c.textPrimary }]}>{t('analytics.unlockPremium')}</Text>
        <Text style={[s.lockBody, { color: c.textSecondary }]}>
          {t('analytics.unlockDesc')}
        </Text>
        <Button
          title={t('analytics.unlockButton')}
          fullWidth
          icon={<Ionicons name="lock-open-outline" size={18} color={palette.white} />}
          onPress={() => nav.navigate('Paywall')}
          style={{ marginTop: spacing.xs }}
        />
      </Card>

      <Card style={s.card}>
        <Text style={[s.kicker, { color: c.textMuted }]}>{t('analytics.nextDrawPredicted')}</Text>
        <View style={[s.rowBetween, { marginTop: spacing.sm }]}>
          <View style={{ gap: 5 }}>
            <Text style={[s.caption, { color: c.textSecondary }]}>{t('analytics.expectedWindow')}</Text>
            {lv()}
          </View>
          <View style={{ alignItems: 'flex-end', gap: 5 }}>
            <Text style={[s.caption, { color: c.textSecondary }]}>{t('analytics.likelihood')}</Text>
            {lv()}
          </View>
        </View>
        <Text style={[s.caption, { color: c.textMuted, marginTop: spacing.xs }]}>{t('analytics.basedOnCadence')}</Text>
      </Card>

      <Card style={s.card}>
        <View style={[s.rowBetween, { marginBottom: spacing.xs }]}>
          <Text style={[s.kicker, { color: c.textMuted }]}>{t('analytics.howToImprove')}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={[s.caption, { color: c.textSecondary }]}>{t('analytics.youNeed')}</Text>
            {lv()}
            <Text style={[s.caption, { color: c.textSecondary }]}>{t('analytics.pts')}</Text>
          </View>
        </View>
        {IMPROVE_PATHS.map((label, i) => (
          <View key={label} style={[s.gapRow, i > 0 && { borderTopColor: c.border, borderTopWidth: StyleSheet.hairlineWidth }]}>
            <Ionicons name="arrow-up-circle-outline" size={16} color={accent} />
            <Text style={[s.gapLabel, { color: c.textPrimary }]}>{label}</Text>
            {lv()}
          </View>
        ))}
      </Card>

      <Card style={s.card}>
        <Text style={[s.kicker, { color: c.textMuted }]}>{t('analytics.forecastNextDraw')}</Text>
        {lb(110)}
        <View style={[s.rowBetween, { marginTop: spacing.xs }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={[s.caption, { color: c.textSecondary }]}>{t('analytics.likelyCutoff')}</Text>
            {lv()}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={[s.caption, { color: c.textSecondary }]}>{t('analytics.confidence')}</Text>
            {lv()}
          </View>
        </View>
      </Card>

      <Card style={s.card}>
        <View style={s.rowBetween}>
          <Text style={[s.kicker, { color: c.textMuted }]}>{t('analytics.whatIf')}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={[s.caption, { color: c.textSecondary }]}>CRS</Text>
            {lv()}
          </View>
        </View>
        {[t('analytics.whatIfAge'), t('analytics.whatIfLanguage')].map((label) => (
          <View key={label} style={{ marginTop: spacing.sm }}>
            <View style={s.rowBetween}>
              <Text style={[s.sliderLabel, { color: c.textSecondary }]}>{label}</Text>
              {lv()}
            </View>
            <View style={{ height: 5, backgroundColor: c.surfaceTertiary, borderRadius: 3, marginTop: 8 }} />
          </View>
        ))}
        {[t('analytics.whatIfFrench'), t('analytics.whatIfPnp')].map((label) => (
          <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border }}>
            <Text style={[s.sliderLabel, { color: c.textSecondary }]}>{label}</Text>
            <View style={[s.lockSwitch, { backgroundColor: c.surfaceTertiary }]}>
              <Ionicons name="lock-closed" size={10} color={c.textMuted} />
            </View>
          </View>
        ))}
        <View style={[s.whatIfOut, { backgroundColor: c.surfaceTertiary + '50' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[s.caption, { color: c.textMuted }]}>{t('analytics.projectedOdds')}</Text>
            {lv()}
          </View>
        </View>
      </Card>

      <Card style={s.card}>
        <Text style={[s.kicker, { color: c.textMuted }]}>{t('analytics.bestStream')}</Text>
        {STREAMS.map((stream, i) => (
          <View key={stream} style={[s.bandRow, i > 0 && { borderTopColor: c.border, borderTopWidth: StyleSheet.hairlineWidth }]}>
            <Text style={[s.bandScore, { color: i === 0 ? accent : c.textPrimary, fontWeight: i === 0 ? typography.bold : typography.medium }]}>{stream}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <Text style={[s.caption, { color: c.textSecondary }]}>{t('analytics.cutoff')}</Text>
              {lv()}{lv()}
            </View>
          </View>
        ))}
        <Text style={[s.caption, { color: c.textMuted, marginTop: spacing.xs }]}>{t('analytics.streamGapLegend')}</Text>
      </Card>

      <Card style={s.card}>
        <Text style={[s.kicker, { color: c.textMuted }]}>{t('analytics.expectedWait')}</Text>
        {SCORE_BANDS.map((band, i) => (
          <View key={band} style={[s.bandRow, i > 0 && { borderTopColor: c.border, borderTopWidth: StyleSheet.hairlineWidth }]}>
            <Text style={[s.bandScore, { color: i === 0 ? accent : c.textPrimary, fontWeight: i === 0 ? typography.bold : typography.medium }]}>{band}</Text>
            {lv()}
          </View>
        ))}
      </Card>

      <Card style={s.card}>
        <Text style={[s.kicker, { color: c.textMuted }]}>{t('analytics.vsRecentCutoffs')}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm, flexWrap: 'wrap' }}>
          <Text style={[s.bodyText, { color: c.textPrimary }]}>{t('premiumCharts.percentileText', { score: userScore, percentile: '' })}</Text>
          {lv()}
          <Text style={[s.bodyText, { color: c.textPrimary }]}>%</Text>
        </View>
        <View style={[s.progressTrack, { backgroundColor: c.surfaceSecondary, marginTop: spacing.sm, alignItems: 'center', justifyContent: 'center' }]}>
          <Ionicons name="lock-closed" size={11} color={c.textMuted} />
        </View>
      </Card>

      <Card style={s.card}>
        <Text style={[s.kicker, { color: c.textMuted }]}>{t('analytics.whereYouStand')}</Text>
        {SCORE_BANDS.map((band, i) => (
          <View key={band} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm }}>
            <Text style={{ width: 92, fontSize: typography.xs, color: i === 0 ? accent : c.textSecondary, fontWeight: i === 0 ? typography.bold : typography.medium }}>{band}</Text>
            {lv()}
          </View>
        ))}
      </Card>

      <Card style={s.card}>
        <Text style={[s.kicker, { color: c.textMuted }]}>{t('analytics.decisionOutlook', { category: 'CEC' })}</Text>
        <View style={[s.statGrid, { marginTop: spacing.sm }]}>
          <View style={[s.statCell, { gap: spacing.xs }]}>
            {lv()}
            <Text style={[s.statCellLabel, { color: c.textMuted }]}>{t('analytics.estDecision')}</Text>
          </View>
          <View style={[s.vDivTall, { backgroundColor: c.border }]} />
          <View style={[s.statCell, { gap: spacing.xs }]}>
            {lv()}
            <Text style={[s.statCellLabel, { color: c.textMuted }]}>{t('analytics.inInventory')}</Text>
          </View>
        </View>
      </Card>

      <Card style={[s.card, { borderWidth: 1, borderColor: accent, alignItems: 'center' }]}>
        <Text style={[s.lockBody, { color: c.textSecondary, textAlign: 'center' }]}>
          {t('premiumCharts.unlockCta')}
        </Text>
        <Button
          title={t('analytics.unlockButton')}
          fullWidth
          icon={<Ionicons name="lock-open-outline" size={18} color={palette.white} />}
          onPress={() => nav.navigate('Paywall')}
          style={{ marginTop: spacing.xs }}
        />
      </Card>
    </>
  );
}

function SliderRow({ c, accent, label, value, min, max, step, onChange, display }: any) {
  return (
    <View style={s.sliderRow}>
      <View style={s.rowBetween}>
        <Text style={[s.sliderLabel, { color: c.textSecondary }]}>{label}</Text>
        <Text style={[s.sliderVal, { color: c.textPrimary }]}>{display}</Text>
      </View>
      <Slider minimumValue={min} maximumValue={max} step={step} value={value} onValueChange={onChange}
        minimumTrackTintColor={accent} maximumTrackTintColor={c.surfaceTertiary} thumbTintColor={accent} />
    </View>
  );
}

function SwitchRow({ c, accent, label, value, onChange }: any) {
  return (
    <View style={[s.switchRow, { borderTopColor: c.border }]}>
      <Text style={[s.sliderLabel, { color: c.textSecondary }]}>{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: accent }} accessibilityLabel={label} />
    </View>
  );
}

const TAB = { fontVariant: ['tabular-nums' as const] };

const s = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: spacing.base },
  body: { padding: spacing.base, paddingTop: spacing.md, gap: spacing.sm },

  segWrap: { flexDirection: 'row', backgroundColor: 'transparent', borderRadius: borderRadius.md,
             padding: spacing.xs, gap: spacing.xs, borderWidth: 0.3, marginVertical: spacing.xs },
  segBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 44, paddingVertical: spacing.sm - 2, borderRadius: borderRadius.md },
  segLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  segText: { fontSize: typography.sm, fontWeight: typography.bold },

  card: { gap: spacing.xs },


  bodyWrap: { flex: 1, position: 'relative' },
  lockOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center',
                 padding: spacing.xl, zIndex: 10 },
  lockCard: { width: '100%', maxWidth: 360, borderWidth: 1, alignItems: 'center', gap: spacing.sm,
              padding: spacing.lg },
  lockIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center',
              marginBottom: spacing.xs },
  lockTitle: { fontSize: typography.lg, fontWeight: typography.black, letterSpacing: -0.3 },
  lockBody: { fontSize: typography.sm, lineHeight: 20 },
  lockBtn: { marginTop: spacing.sm },
  skimIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
              marginBottom: spacing.xs },
  lockVal: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 5,
             paddingHorizontal: 7, paddingVertical: 3 },
  lockValText: { fontSize: 12, fontWeight: typography.semibold },
  lockBlock: { borderRadius: borderRadius.md, borderWidth: StyleSheet.hairlineWidth,
               alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
               marginTop: spacing.xs },
  lockSwitch: { height: 22, width: 42, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },

  kicker: { fontSize: typography.xs, fontWeight: typography.bold, letterSpacing: 0.8 },
  opsBig: { fontSize: typography.xl, fontWeight: typography.black, letterSpacing: -0.5, ...TAB },
  bodyText: { fontSize: typography.sm, lineHeight: 20, fontWeight: typography.medium },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  num: { fontWeight: typography.bold, ...TAB },
  caption: { fontSize: typography.xs, lineHeight: 16, marginTop: 2 },

  tagPill: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: borderRadius.md },
  tagText: { fontSize: typography.xs, fontWeight: typography.bold },
  progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden', marginTop: spacing.xs },
  progressFill: { height: '100%', borderRadius: 4 },
  statGrid: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs },
  statCell: { flex: 1, alignItems: 'center', gap: 2 },
  statCellLabel: { fontSize: 10, textAlign: 'center' },
  vDivTall: { width: 1, height: 32 },

  gaugeWrap: { alignItems: 'center', marginTop: spacing.xs },
  gaugeCenter: { position: 'absolute', bottom: 0, alignItems: 'center' },
  oddsLabel: { fontSize: typography['2xl'], fontWeight: typography.black, letterSpacing: -0.5 },
  oddsTime: { fontSize: typography.xs, marginTop: 1 },
  compareRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md,
                borderTopWidth: StyleSheet.hairlineWidth, marginTop: spacing.sm, paddingTop: spacing.sm },
  compareText: { fontSize: typography.sm },
  vDiv: { width: 1, height: 16 },

  gapBadge: { fontSize: typography.xs, fontWeight: typography.bold },
  gapRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  gapLabel: { flex: 1, fontSize: typography.sm, fontWeight: typography.medium },
  gapDelta: { fontSize: typography.sm, fontWeight: typography.bold, ...TAB },

  whatIfScore: { fontSize: typography.xl, fontWeight: typography.black, ...TAB },
  sliderRow: { marginTop: spacing.xs },
  sliderLabel: { fontSize: typography.sm },
  sliderVal: { fontSize: typography.sm, fontWeight: typography.bold, ...TAB },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
               borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.sm, marginTop: spacing.xs },
  whatIfOut: { borderRadius: borderRadius.md, paddingVertical: spacing.sm, alignItems: 'center', marginTop: spacing.sm },
  whatIfOutText: { fontSize: typography.sm, fontWeight: typography.bold },

  miniRow: { flexDirection: 'row', gap: spacing.sm },
  miniCard: { flex: 1, gap: spacing.xs },

  legendRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 9, height: 9, borderRadius: 5 },
  legendText: { fontSize: typography.xs, fontWeight: typography.medium },

  bandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm },
  bandScore: { fontSize: typography.sm },
  bandWait: { fontSize: typography.sm },

  chipRow: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs, flexWrap: 'wrap' },
  chip: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: borderRadius.md, minWidth: 38, alignItems: 'center' },
  chipText: { fontSize: typography.sm, fontWeight: typography.bold, ...TAB },

  disclaimer: { fontSize: typography.xs, lineHeight: 16, textAlign: 'center', paddingHorizontal: spacing.sm, marginTop: spacing.sm },
});
