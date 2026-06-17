import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useDrawsStore } from '@/store/drawsStore';
import { usePremiumStore } from '@/store/premiumStore';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/types';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/layout/AppHeader';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { STORAGE_KEYS, TRIAL_DAYS, TRIAL_MS } from '@/constants';
import { palette, spacing, typography, borderRadius } from '@/theme';
import { useColors } from '@/hooks/useColors';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useTabBarLayout } from '@/hooks/useTabBarLayout';
import { OddsGauge, ForecastBandChart, MiniBars, MarkerBar, HorizontalBars, TrendLineChart } from '../components/PremiumCharts';
import { useAnalyticsData } from '../hooks/useAnalyticsData';
import { useProfileStore, DEFAULT_CALC_INPUTS, type CalcInputs } from '@/store/profileStore';
import { useProcessingTimesStore } from '@/store/processingTimesStore';
import { useEePoolStore } from '@/store/eePoolStore';
import { buildCRSInput } from '@/features/onboarding/utils/buildCRSInput';
import { calculateCRS } from '@/features/onboarding/utils/crsCalculator';


const ODDS_COLOR: Record<string, string> = { High: palette.success, Moderate: palette.warning, Low: palette.danger };
const fmt = (n: number) => n.toLocaleString('en-CA');

/** "2d 14h" / "14h 5m" / "8m" — compact trial countdown. */
function fmtTimeLeft(ms: number): string {
  const total = Math.max(0, ms);
  const d = Math.floor(total / 86_400_000);
  const h = Math.floor((total % 86_400_000) / 3_600_000);
  const m = Math.floor((total % 3_600_000) / 60_000);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

type TabKey = 'ops' | 'improve' | 'trends';
const TABS: { key: TabKey; label: string }[] = [
  { key: 'ops', label: 'Operations' },
  { key: 'improve', label: 'Improve' },
  { key: 'trends', label: 'Trends' },
];

export default function PremiumAnalyticsScreen() {
  const c = useColors();
  const accent = useAccentColor();
  const { contentPaddingBottom } = useTabBarLayout();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [tab, setTab] = useState<TabKey>('ops');
  const data = useAnalyticsData();
  const isPremium = usePremiumStore((s) => s.isPremium);
  const premiumLoaded = usePremiumStore((s) => s.loaded);
  const billingAvailable = usePremiumStore((s) => s.billingAvailable);
  const trialStartedAt = usePremiumStore((s) => s.trialStartedAt);
  const trialChecked = usePremiumStore((s) => s.trialChecked);

  // Live-ticking clock so the trial countdown updates while the screen is open.
  // Paid users have no countdown, so don't tick (avoids a needless full-screen
  // re-render every minute on this chart-heavy screen for the common case).
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (isPremium) return;
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, [isPremium]);

  // Trial math. Paid users bypass it entirely. When no purchase path exists
  // (iOS without StoreKit, emulator, billing outage) the gate fails OPEN — we
  // never show a trial countdown or lock for an unlock the user can't buy.
  const trialEndsAt = trialStartedAt != null ? trialStartedAt + TRIAL_MS : null;
  const trialActive = billingAvailable && !isPremium && trialEndsAt != null && now < trialEndsAt;
  const trialExpired = billingAvailable && !isPremium && trialEndsAt != null && now >= trialEndsAt;
  const trialMsLeft = trialEndsAt != null ? trialEndsAt - now : 0;

  // Gate priority: paywall (paid or in-trial only) → then "add your CRS score".
  // Locked once the trial has expired and the user hasn't bought. Resolution
  // flags guard against flashing the paywall before billing/trial settle.
  const resolved = premiumLoaded && trialChecked;
  const locked = resolved && !isPremium && trialExpired;
  const noProfile = !locked && data.userScore === 0;

  // One-time intro: "free for 3 days" modal on first in-trial visit.
  const [showIntro, setShowIntro] = useState(false);
  useEffect(() => {
    if (!resolved || isPremium || !trialActive) return;
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEYS.TRIAL_INTRO_SEEN)
      .then((seen) => {
        if (!cancelled && seen !== 'true') setShowIntro(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [resolved, isPremium, trialActive]);

  const dismissIntro = useCallback(() => {
    setShowIntro(false);
    AsyncStorage.setItem(STORAGE_KEYS.TRIAL_INTRO_SEEN, 'true').catch(() => {});
  }, []);

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
  // Anchored to the user's saved profile; the sliders override only age, first
  // language (as CLB), French as a second language, and a provincial nomination.
  const baseInputs = useProfileStore((s) => s.profile?.calculatorInputs) ?? DEFAULT_CALC_INPUTS;
  const [age, setAge] = useState(() => baseInputs.age || 30);
  const [clb, setClb] = useState(9);
  const [french, setFrench] = useState(false);
  const [pnp, setPnp] = useState(false);
  const whatIfScore = useMemo(() => {
    const di: CalcInputs = {
      ...baseInputs,
      age,
      firstLangTest: 'CLB',
      firstLangSpeaking: clb, firstLangListening: clb, firstLangReading: clb, firstLangWriting: clb,
      hasProvincialNomination: pnp,
      hasSecondLang: french || baseInputs.hasSecondLang,
      secondLangTest: french ? 'TCF' : baseInputs.secondLangTest,
      // NCLC 7 thresholds on the TCF scale (triggers the French bonus correctly).
      secondLangSpeaking:  french ? 10  : baseInputs.secondLangSpeaking,
      secondLangListening: french ? 458 : baseInputs.secondLangListening,
      secondLangReading:   french ? 453 : baseInputs.secondLangReading,
      secondLangWriting:   french ? 10  : baseInputs.secondLangWriting,
    };
    return calculateCRS(buildCRSInput(di)).total;
  }, [baseInputs, age, clb, french, pnp]);
  const whatIfLabel = whatIfScore - data.trendCutoff >= 10 ? 'High' : whatIfScore - data.trendCutoff >= -10 ? 'Moderate' : 'Low';

  const oddsColor = ODDS_COLOR[data.oddsLabel] ?? palette.warning;

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.surfacePrimary }]} edges={['top', 'left', 'right']}>
      <View style={s.header}>
        <AppHeader title="Analytics" />
      </View>

      <View style={s.bodyWrap}>
      <ScrollView
        contentContainerStyle={[s.body, { paddingBottom: contentPaddingBottom }]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!noProfile && !locked}
      >
        {/* Free-trial countdown — only while the trial is running and unpaid */}
        {trialActive && (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => nav.navigate('Paywall')}
            accessibilityRole="button"
            accessibilityLabel={`Free trial: ${fmtTimeLeft(trialMsLeft)} left. Tap to unlock forever.`}
          >
            <View style={[s.trialBar, { backgroundColor: accent + '14', borderColor: accent + '55' }]}>
              <Ionicons name="time-outline" size={16} color={accent} />
              <Text style={[s.trialText, { color: c.textPrimary }]}>
                Free trial · <Text style={{ color: accent, fontWeight: typography.bold }}>{fmtTimeLeft(trialMsLeft)}</Text> left
              </Text>
              <Text style={[s.trialCta, { color: accent }]}>Unlock →</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Pinned odds hero */}
        <Card style={[s.card, { borderTopWidth: 2, borderTopColor: accent }]}>
          <Text style={[s.kicker, { color: c.textMuted }]}>YOUR ODDS · {data.category}</Text>
          <View style={s.gaugeWrap}>
            <OddsGauge
              fraction={data.oddsFraction}
              color={oddsColor}
              track={c.surfaceTertiary}
              accessibilityLabel={`Invitation odds: ${data.oddsLabel}. Your score ${data.userScore} versus trend cutoff ${data.trendCutoff}. ${data.timeframe}.`}
            />
            <View style={s.gaugeCenter}>
              <Text style={[s.oddsLabel, { color: oddsColor }]}>{data.oddsLabel}</Text>
              <Text style={[s.oddsTime, { color: c.textSecondary }]}>{data.timeframe}</Text>
            </View>
          </View>
          <View style={[s.compareRow, { borderTopColor: c.border }]}>
            <Text style={[s.compareText, { color: c.textSecondary }]}>Your <Text style={[s.num, { color: c.textPrimary }]}>{data.userScore}</Text></Text>
            <View style={[s.vDiv, { backgroundColor: c.border }]} />
            <Text style={[s.compareText, { color: c.textSecondary }]}>Trend cutoff <Text style={[s.num, { color: c.textPrimary }]}>~{data.trendCutoff}</Text></Text>
          </View>
        </Card>

        {/* Section tabs */}
        <View style={[s.segWrap, { backgroundColor: c.surfaceSecondary, borderColor: c.border }]}>
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[s.segBtn, active && { backgroundColor: accent }]}
                onPress={() => setTab(t.key)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text style={[s.segText, { color: active ? palette.white : c.textSecondary }]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {tab === 'ops' && <OpsTab c={c} accent={accent} data={data} />}
        {tab === 'improve' && (
          <ImproveTab
            c={c} accent={accent} data={data}
            age={age} setAge={setAge} clb={clb} setClb={setClb}
            french={french} setFrench={setFrench} pnp={pnp} setPnp={setPnp}
            whatIfScore={whatIfScore} whatIfLabel={whatIfLabel}
          />
        )}
        {tab === 'trends' && <TrendsTab c={c} accent={accent} data={data} />}

        <Text style={[s.disclaimer, { color: c.textMuted }]}>
          Estimates, not guarantees. Based on historical IRCC draw data and your profile. IRCC draws
          are unpredictable — always verify with the official tools.
        </Text>
      </ScrollView>

        {/*
          Locked overlay — dims the analytics behind it and blocks interaction.
          Shown only once the free trial has expired and the user hasn't bought.
          `noProfile` is the secondary gate (owns/in-trial but no CRS score yet).
        */}
        {locked && (
          <View style={[s.lockOverlay, { backgroundColor: c.surfacePrimary + 'E6' }]}>
            <Card style={[s.lockCard, { borderColor: accent }]}>
              <View style={[s.lockIcon, { backgroundColor: accent + '1A' }]}>
                <Ionicons name="lock-closed" size={26} color={accent} />
              </View>
              <Text style={[s.lockTitle, { color: c.textPrimary }]}>Your free trial has ended</Text>
              <Text style={[s.lockBody, { color: c.textSecondary }]}>
                Your {TRIAL_DAYS}-day free trial of Analytics is over. Unlock it forever with a
                one-time purchase — your odds, forecasts, percentile and what-if scenarios.
              </Text>
              <Button
                title="Unlock forever"
                fullWidth
                icon={<Ionicons name="sparkles-outline" size={18} color={palette.white} />}
                onPress={() => nav.navigate('Paywall')}
                style={s.lockBtn}
              />
            </Card>
          </View>
        )}
        {noProfile && (
          <View style={[s.lockOverlay, { backgroundColor: c.surfacePrimary + 'E6' }]}>
            <Card style={[s.lockCard, { borderColor: accent }]}>
              <View style={[s.lockIcon, { backgroundColor: accent + '1A' }]}>
                <Ionicons name="lock-closed" size={26} color={accent} />
              </View>
              <Text style={[s.lockTitle, { color: c.textPrimary }]}>Complete your CRS score</Text>
              <Text style={[s.lockBody, { color: c.textSecondary }]}>
                Analytics is personalised to your profile. Calculate your CRS score to unlock your
                odds, percentile, forecast and what-if scenarios.
              </Text>
              <Button
                title="Calculate my CRS"
                fullWidth
                icon={<Ionicons name="calculator-outline" size={18} color={palette.white} />}
                onPress={() => nav.navigate('CrsCalculator')}
                style={s.lockBtn}
              />
            </Card>
          </View>
        )}
      </View>

      {/* First-visit trial intro */}
      <Modal visible={showIntro} transparent animationType="fade" onRequestClose={dismissIntro}>
        <View style={s.modalScrim}>
          <Card style={[s.modalCard, { borderColor: accent }]}>
            <View style={[s.lockIcon, { backgroundColor: accent + '1A' }]}>
              <Ionicons name="sparkles" size={26} color={accent} />
            </View>
            <Text style={[s.lockTitle, { color: c.textPrimary }]}>Analytics is free for {TRIAL_DAYS} days</Text>
            <Text style={[s.lockBody, { color: c.textSecondary }]}>
              Explore your live odds, forecasts, percentile and what-if scenarios — free for{' '}
              {TRIAL_DAYS} days. After that, a one-time purchase unlocks it forever (no subscription).
            </Text>
            <Text style={[s.modalCountdown, { color: accent }]}>{fmtTimeLeft(trialMsLeft)} left</Text>
            <Button title="Start exploring" fullWidth onPress={dismissIntro} style={s.lockBtn} />
            <TouchableOpacity onPress={() => { dismissIntro(); nav.navigate('Paywall'); }} style={s.modalLink}>
              <Text style={[s.modalLinkText, { color: c.textSecondary }]}>See unlock options</Text>
            </TouchableOpacity>
          </Card>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Operations tab (IRCC operational data) ───────────────────────────────────
function OpsTab({ c, accent, data }: any) {
  const i = data.ircc;
  return (
    <>
      <Card style={s.card}>
        <Text style={[s.kicker, { color: c.textMuted }]}>NEXT DRAW · predicted</Text>
        <View style={s.rowBetween}>
          <Text style={[s.opsBig, { color: c.textPrimary }]}>~{i.nextDrawWindow}</Text>
          <View style={[s.tagPill, { backgroundColor: accent + '18' }]}>
            <Text style={[s.tagText, { color: accent }]}>{i.nextDrawLikely}</Text>
          </View>
        </View>
        <Text style={[s.caption, { color: c.textSecondary }]}>
          <Text style={[s.num, { color: c.textPrimary }]}>{i.daysSinceLast}</Text> days since last · avg gap{' '}
          <Text style={[s.num, { color: c.textPrimary }]}>{i.avgGap}</Text> days · typically ~<Text style={[s.num, { color: c.textPrimary }]}>{i.typicalSize}</Text> ITAs
        </Text>
      </Card>

      <Card style={s.card}>
        <Text style={[s.kicker, { color: c.textMuted }]}>{i.curYear} INVITATIONS PACE</Text>
        <View style={s.rowBetween}>
          <Text style={[s.opsBig, { color: c.textPrimary }]}>{fmt(i.itaYtd)}</Text>
          <Text style={[s.caption, { color: c.textSecondary }]}>ITAs issued YTD</Text>
        </View>
        <View style={[s.progressTrack, { backgroundColor: c.surfaceTertiary }]}>
          <View style={[s.progressFill, { backgroundColor: accent, width: `${Math.min(100, Math.round((i.itaYtd / Math.max(1, i.itaProjected)) * 100))}%` }]} />
        </View>
        <Text style={[s.caption, { color: c.textMuted }]}>
          ~{fmt(i.itaProjected)} projected · past {i.prevYear}’s {fmt(i.itaPrevYear)} pace · PR target {fmt(i.prTarget)}
        </Text>
      </Card>

      <Card style={s.card}>
        <Text style={[s.kicker, { color: c.textMuted }]}>YOUR PLACE IN LINE · {data.category}</Text>
        <View style={s.statGrid}>
          <View style={s.statCell}><Text style={[s.opsBig, { color: accent }]}>{fmt(i.peopleAhead)}</Text><Text style={[s.statCellLabel, { color: c.textMuted }]}>ahead of you</Text></View>
          <View style={[s.vDivTall, { backgroundColor: c.border }]} />
          <View style={s.statCell}><Text style={[s.opsBig, { color: c.textPrimary }]}>~{i.estMonths}mo</Text><Text style={[s.statCellLabel, { color: c.textMuted }]}>est. decision</Text></View>
          <View style={[s.vDivTall, { backgroundColor: c.border }]} />
          <View style={s.statCell}><Text style={[s.opsBig, { color: c.textPrimary }]}>{fmt(i.myInventory)}</Text><Text style={[s.statCellLabel, { color: c.textMuted }]}>in inventory</Text></View>
        </View>
      </Card>

      <Card style={s.card}>
        <Text style={[s.kicker, { color: c.textMuted }]}>POOL COMPOSITION · candidates by CRS</Text>
        <View style={{ marginTop: spacing.xs }}>
          <HorizontalBars track={c.surfaceTertiary} labelColor={c.textSecondary} valueColor={c.textPrimary}
            items={i.poolComposition.map((p: any) => ({
              label: p.label + (p.mine ? '  ← you' : ''), value: p.value,
              max: Math.max(...i.poolComposition.map((x: any) => x.value)),
              color: p.mine ? accent : c.textMuted, highlight: !!p.mine,
            }))} />
        </View>
        <Text style={[s.caption, { color: c.textSecondary }]}>
          ≈<Text style={[s.num, { color: c.textPrimary }]}>{fmt(i.candidatesAtOrAbove)}</Text> score at or above you · pool ~{fmt(i.poolTotal)} · as of {i.poolAsOf}
        </Text>
      </Card>

      <Card style={s.card}>
        <Text style={[s.kicker, { color: c.textMuted }]}>{i.curYear} ITA MIX · by category</Text>
        <View style={{ marginTop: spacing.xs }}>
          <HorizontalBars track={c.surfaceTertiary} labelColor={c.textSecondary} valueColor={c.textPrimary}
            items={i.categoryMix.map((m: any, idx: number) => ({ label: m.label, value: m.value, max: 40, suffix: '%', color: idx === 0 ? accent : c.textMuted }))} />
        </View>
      </Card>

      <Card style={s.card}>
        <Text style={[s.kicker, { color: c.textMuted }]}>LATEST CUTOFF · by category</Text>
        <View style={{ marginTop: spacing.xs }}>
          <HorizontalBars track={c.surfaceTertiary} labelColor={c.textSecondary} valueColor={c.textPrimary}
            items={i.categoryCutoffs.map((cc: any) => ({ label: cc.label, value: cc.value, max: 750, color: cc.label.startsWith('French') ? palette.success : accent, highlight: cc.label.startsWith('French') }))} />
        </View>
      </Card>

      <Card style={[s.card, { borderLeftWidth: 3, borderLeftColor: palette.success }]}>
        <Text style={[s.kicker, { color: c.textMuted }]}>FRENCH ADVANTAGE</Text>
        <Text style={[s.bodyText, { color: c.textPrimary }]}>
          French draws cut off <Text style={[s.num, { color: palette.success }]}>~{i.cecCutoff - i.frenchCutoff} pts</Text> below CEC
          ({i.frenchCutoff} vs {i.cecCutoff}). NCLC 7 French is the biggest CRS shortcut.
        </Text>
      </Card>

      <Card style={s.card}>
        <Text style={[s.kicker, { color: c.textMuted }]}>DRAW SIZE & FREQUENCY · {i.curYear}</Text>
        <View style={s.statGrid}>
          <View style={s.statCell}><Text style={[s.opsBig, { color: c.textPrimary }]}>{i.avgSize}</Text><Text style={[s.statCellLabel, { color: c.textMuted }]}>avg/draw</Text></View>
          <View style={[s.vDivTall, { backgroundColor: c.border }]} />
          <View style={s.statCell}><Text style={[s.opsBig, { color: c.textPrimary }]}>{i.largest}</Text><Text style={[s.statCellLabel, { color: c.textMuted }]}>largest</Text></View>
          <View style={[s.vDivTall, { backgroundColor: c.border }]} />
          <View style={s.statCell}><Text style={[s.opsBig, { color: c.textPrimary }]}>{i.drawsYtd}</Text><Text style={[s.statCellLabel, { color: c.textMuted }]}>draws YTD</Text></View>
        </View>
      </Card>

      <Card style={s.card}>
        <Text style={[s.kicker, { color: c.textMuted }]}>TIE-BREAK · latest draw</Text>
        <Text style={[s.num, { color: c.textPrimary, fontSize: typography.base }]}>{i.tieBreak}</Text>
        <Text style={[s.caption, { color: c.textMuted }]}>
          At the cutoff, only profiles submitted before this time were invited. Submit early to win ties.
        </Text>
      </Card>
    </>
  );
}

// ─── Improve tab (score-centric) ──────────────────────────────────────────────
function ImproveTab({ c, accent, data, age, setAge, clb, setClb, french, setFrench, pnp, setPnp, whatIfScore, whatIfLabel }: any) {
  return (
    <>
      <Card style={s.card}>
        <View style={s.rowBetween}>
          <Text style={[s.kicker, { color: c.textMuted }]}>HOW TO IMPROVE</Text>
          <Text style={[s.gapBadge, { color: accent }]}>+{data.gapPoints} to “{data.gapTo}”</Text>
        </View>
        {data.paths.map((p: any, idx: number) => (
          <View key={p.label} style={[s.gapRow, idx > 0 && { borderTopColor: c.border, borderTopWidth: StyleSheet.hairlineWidth }]}>
            <Ionicons name="arrow-up-circle-outline" size={16} color={accent} />
            <Text style={[s.gapLabel, { color: c.textPrimary }]}>{p.label}</Text>
            <Text style={[s.gapDelta, { color: palette.success }]}>{p.delta}</Text>
          </View>
        ))}
      </Card>

      <Card style={s.card}>
        <Text style={[s.kicker, { color: c.textMuted }]}>FORECAST · NEXT {data.category.toUpperCase()} DRAW</Text>
        <ForecastBandChart actual={data.forecast.actual} forecast={data.forecast.proj} band={data.forecast.band}
          min={data.forecast.min} max={data.forecast.max} lineColor={accent} bandColor={accent + '26'} gridColor={c.border}
          accessibilityLabel={`Next ${data.category} draw forecast: likely cutoff ${data.forecast.likely}, ${data.forecast.confidence.toLowerCase()} confidence.`} />
        <Text style={[s.caption, { color: c.textSecondary }]}>
          Likely <Text style={[s.num, { color: c.textPrimary }]}>{data.forecast.likely}</Text> · confidence {data.forecast.confidence.toLowerCase()}
        </Text>
      </Card>

      <Card style={s.card}>
        <View style={s.rowBetween}>
          <Text style={[s.kicker, { color: c.textMuted }]}>WHAT IF…</Text>
          <Text style={[s.whatIfScore, { color: c.textPrimary }]}>CRS {whatIfScore}</Text>
        </View>
        <SliderRow c={c} accent={accent} label="Age" value={age} min={18} max={45} step={1} onChange={setAge} display={String(age)} />
        <SliderRow c={c} accent={accent} label="Language (CLB)" value={clb} min={4} max={10} step={1} onChange={setClb} display={`CLB ${clb}`} />
        <SwitchRow c={c} accent={accent} label="French (NCLC 7+)" value={french} onChange={setFrench} />
        <SwitchRow c={c} accent={accent} label="Provincial nomination" value={pnp} onChange={setPnp} />
        <View style={[s.whatIfOut, { backgroundColor: (ODDS_COLOR[whatIfLabel] ?? accent) + '14' }]}>
          <Text style={[s.whatIfOutText, { color: ODDS_COLOR[whatIfLabel] ?? accent }]}>Projected odds: {whatIfLabel}</Text>
        </View>
      </Card>

      <Card style={s.card}>
        <Text style={[s.kicker, { color: c.textMuted }]}>BEST STREAM FOR YOU · est. odds</Text>
        <View style={{ marginTop: spacing.xs }}>
          <HorizontalBars track={c.surfaceTertiary} labelColor={c.textSecondary} valueColor={c.textPrimary}
            items={data.streams.map((st: any, idx: number) => ({ label: st.label, value: st.value, max: 100, suffix: '%', color: idx === 0 ? palette.success : accent, highlight: idx === 0 }))} />
        </View>
        <Text style={[s.caption, { color: c.textMuted }]}>Based on your profile vs each stream’s recent cutoffs</Text>
      </Card>

      <Card style={s.card}>
        <Text style={[s.kicker, { color: c.textMuted }]}>EXPECTED WAIT BY SCORE</Text>
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
        <Text style={[s.kicker, { color: c.textMuted }]}>PERCENTILE</Text>
        <Text style={[s.bodyText, { color: c.textPrimary }]}>Your {data.userScore} beats {data.percentile}% of recent draw cutoffs</Text>
        <View style={{ marginTop: spacing.sm }}>
          <MarkerBar
            fraction={data.percentile / 100}
            color={accent}
            track={c.surfaceTertiary}
            accessibilityLabel={`Percentile: your score beats ${data.percentile} percent of recent draw cutoffs.`}
          />
        </View>
      </Card>
    </>
  );
}

// ─── Trends tab (historical patterns) ─────────────────────────────────────────
function TrendsTab({ c, accent, data }: any) {
  return (
    <>
      <Card style={s.card}>
        <Text style={[s.kicker, { color: c.textMuted }]}>CUTOFF vs YOUR SCORE · last {data.trend.length} draws</Text>
        <TrendLineChart
          series={[{ points: data.trend, color: accent }]}
          min={data.trendMin} max={data.trendMax}
          gridColor={c.border} axisColor={c.textMuted}
          refLine={{ value: data.userScore, color: palette.success, label: `you ${data.userScore}` }}
          width={300} height={150}
          accessibilityLabel={`Cutoff trend over the last ${data.trend.length} draws, ranging ${data.trendMin} to ${data.trendMax}, compared against your score of ${data.userScore}.`}
        />
        <Text style={[s.caption, { color: c.textMuted }]}>Green dashed = your score. Above the line = you’d clear that draw.</Text>
      </Card>

      <Card style={s.card}>
        <Text style={[s.kicker, { color: c.textMuted }]}>CUTOFF BY CATEGORY · trend</Text>
        <TrendLineChart
          series={[
            { points: data.categoryTrends.CEC, color: accent },
            { points: data.categoryTrends.French, color: palette.success },
            { points: data.categoryTrends.PNP, color: palette.warning },
          ]}
          min={data.trendMin} max={data.trendMax}
          gridColor={c.border} axisColor={c.textMuted}
          width={300} height={150}
          accessibilityLabel="Cutoff trend by category over recent draws: Canadian Experience Class, French, and Provincial Nominee Program."
        />
        <View style={s.legendRow}>
          {[['CEC', accent], ['French', palette.success], ['PNP', palette.warning]].map(([lbl, col]) => (
            <View key={lbl} style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: col as string }]} />
              <Text style={[s.legendText, { color: c.textSecondary }]}>{lbl}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Card style={s.card}>
        <Text style={[s.kicker, { color: c.textMuted }]}>INVITATIONS PER DRAW · last {data.invitationsTrend.length}</Text>
        <TrendLineChart
          series={[{ points: data.invitationsTrend, color: palette.success, fill: palette.success + '22' }]}
          min={0} max={Math.max(1, ...data.invitationsTrend) * 1.1}
          gridColor={c.border} axisColor={c.textMuted}
          width={300} height={140}
          accessibilityLabel={`Invitations issued per draw over the last ${data.invitationsTrend.length} rounds.`}
        />
        <Text style={[s.caption, { color: c.textMuted }]}>ITAs issued each round</Text>
      </Card>

      <Card style={s.card}>
        <Text style={[s.kicker, { color: c.textMuted }]}>WHERE YOU STAND · recent cutoffs</Text>
        <View style={{ marginTop: spacing.xs }}>
          <HorizontalBars track={c.surfaceTertiary} labelColor={c.textSecondary} valueColor={c.textPrimary}
            items={data.distribution.map((d: any) => ({ label: d.label + (d.mine ? '  ← you' : ''), value: d.value, max: Math.max(1, ...data.distribution.map((x: any) => x.value)), color: d.mine ? accent : c.textMuted, highlight: !!d.mine }))} />
        </View>
      </Card>

      <Card style={s.card}>
        <Text style={[s.kicker, { color: c.textMuted }]}>DRAWS BY MONTH · last 12</Text>
        <MiniBars values={data.byMonth} color={accent} track={c.surfaceTertiary} width={300} height={48}
          accessibilityLabel={`Draws by month over the last 12 months. Busiest ${data.busiestMonth}, quietest ${data.quietestMonth}.`} />
        <Text style={[s.caption, { color: c.textSecondary }]}>Busiest: <Text style={[s.num, { color: c.textPrimary }]}>{data.busiestMonth}</Text> · quietest <Text style={[s.num, { color: c.textPrimary }]}>{data.quietestMonth}</Text></Text>
      </Card>

      <View style={s.miniRow}>
        <Card style={s.miniCard}>
          <Text style={[s.kicker, { color: c.textMuted }]}>DRAW CADENCE</Text>
          <MiniBars values={data.cadence} color={accent} track={c.surfaceTertiary}
            accessibilityLabel={`Draw cadence: roughly every ${data.cadenceDays} days.`} />
          <Text style={[s.caption, { color: c.textSecondary }]}>~every <Text style={[s.num, { color: c.textPrimary }]}>{data.cadenceDays}</Text> days</Text>
        </Card>
        <Card style={s.miniCard}>
          <Text style={[s.kicker, { color: c.textMuted }]}>INVITATIONS</Text>
          <MiniBars values={data.volume} color={palette.success} track={c.surfaceTertiary}
            accessibilityLabel={`Invitations per recent draw. ${data.invitationsYtd} issued year to date.`} />
          <Text style={[s.caption, { color: c.textSecondary }]}><Text style={[s.num, { color: c.textPrimary }]}>{data.invitationsYtd}</Text> YTD</Text>
        </Card>
      </View>

      <Card style={s.card}>
        <View style={s.rowBetween}>
          <Text style={[s.kicker, { color: c.textMuted }]}>CUTOFF MOMENTUM · last 6</Text>
          <Text style={[s.num, { color: data.momentumDown ? palette.success : palette.danger }]}>
            {data.momentumDown ? 'trending down ↓' : 'trending up ↑'}
          </Text>
        </View>
        <View style={s.chipRow}>
          {data.momentum.map((d: number, idx: number) => (
            <View key={idx} style={[s.chip, { backgroundColor: (d <= 0 ? palette.success : palette.danger) + '18' }]}>
              <Text style={[s.chipText, { color: d <= 0 ? palette.success : palette.danger }]}>{d > 0 ? `+${d}` : d}</Text>
            </View>
          ))}
        </View>
        <Text style={[s.caption, { color: c.textMuted }]}>Falling cutoffs improve your odds · avg {data.avgInvitations} ITAs/draw</Text>
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
      <Switch value={value} onValueChange={onChange} trackColor={{ true: accent }} />
    </View>
  );
}

const TAB = { fontVariant: ['tabular-nums' as const] };

const s = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: spacing.base, paddingTop: spacing.base },
  body: { padding: spacing.base, paddingTop: spacing.md, gap: spacing.sm },

  segWrap: { flexDirection: 'row', backgroundColor: 'transparent', borderRadius: borderRadius.md,
             padding: spacing.xs, gap: spacing.xs, borderWidth: 0.3, marginVertical: spacing.xs },
  segBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 44, paddingVertical: spacing.sm - 2, borderRadius: borderRadius.md },
  segText: { fontSize: typography.sm, fontWeight: typography.bold },

  card: { gap: spacing.xs },

  bodyWrap: { flex: 1, position: 'relative' },
  lockOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center',
                 padding: spacing.xl, zIndex: 10 },
  lockCard: { width: '100%', maxWidth: 360, borderWidth: 1, alignItems: 'center', gap: spacing.sm,
              padding: spacing.lg },
  lockIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center',
              marginBottom: spacing.xs },
  lockTitle: { fontSize: typography.lg, fontWeight: typography.black, letterSpacing: -0.3, textAlign: 'center' },
  lockBody: { fontSize: typography.sm, lineHeight: 20, textAlign: 'center' },
  lockBtn: { marginTop: spacing.sm },

  trialBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderWidth: 1,
              borderRadius: borderRadius.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.base },
  trialText: { flex: 1, fontSize: typography.sm },
  trialCta: { fontSize: typography.sm, fontWeight: typography.bold },

  modalScrim: { flex: 1, backgroundColor: '#000000B3', alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  modalCard: { width: '100%', maxWidth: 360, borderWidth: 1, alignItems: 'center', gap: spacing.sm, padding: spacing.lg },
  modalCountdown: { fontSize: typography.base, fontWeight: typography.black, ...TAB },
  modalLink: { paddingVertical: spacing.xs },
  modalLinkText: { fontSize: typography.sm, fontWeight: typography.medium, textDecorationLine: 'underline' },
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
