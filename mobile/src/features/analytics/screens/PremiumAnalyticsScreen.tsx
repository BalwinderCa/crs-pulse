import { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/layout/AppHeader';
import { Card } from '@/components/common/Card';
import { palette, spacing, typography, borderRadius } from '@/theme';
import { useColors } from '@/hooks/useColors';
import { useAccentColor } from '@/hooks/useAccentColor';
import { usePremiumStore } from '../store/premiumStore';
import { OddsGauge, ForecastBandChart, MiniBars, MarkerBar } from '../components/PremiumCharts';

// ─── Stub data (layout only — real calcs come from draws + profile later) ─────
const STUB = {
  category: 'Canadian Experience Class',
  userScore: 512,
  trendCutoff: 507,
  oddsFraction: 0.62,
  oddsLabel: 'Moderate' as const,
  timeframe: '~2–3 draws · ≈ 6 weeks',
  gapTo: 'High',
  gapPoints: 14,
  paths: [
    { label: 'French (NCLC 7+)', delta: '+50' },
    { label: 'Listening → CLB 9', delta: '+6' },
    { label: 'Provincial nomination', delta: '+600' },
  ],
  forecast: {
    actual: [515, 521, 509, 512, 507],
    proj: [507, 511, 514],
    band: [{ lo: 507, hi: 507 }, { lo: 503, hi: 519 }, { lo: 500, hi: 528 }],
    min: 495,
    max: 535,
    likely: '508–522',
    confidence: 'Medium',
  },
  trend: [518, 511, 524, 509, 515, 506, 512, 504, 510],
  cadenceDays: 21,
  cadence: [18, 24, 14, 28, 21, 16, 21],
  invitationsYtd: '84,300',
  volume: [62, 58, 31, 47, 25, 60],
  percentile: 78,
};

const ODDS_COLOR: Record<string, string> = {
  High: palette.success,
  Moderate: palette.warning,
  Low: palette.danger,
};

export default function PremiumAnalyticsScreen() {
  const c = useColors();
  const accent = useAccentColor();
  const insets = useSafeAreaInsets();
  const { isPremium, toggle } = usePremiumStore();

  // What-if simulator state (stub recompute)
  const [age, setAge] = useState(30);
  const [clb, setClb] = useState(9);
  const [french, setFrench] = useState(false);
  const [pnp, setPnp] = useState(false);
  const whatIfScore = Math.min(
    1200,
    Math.round(380 + Math.max(0, 45 - age) * 2 + clb * 12 + (french ? 50 : 0) + (pnp ? 600 : 0)),
  );
  const whatIfLabel = whatIfScore - STUB.trendCutoff >= 10 ? 'High' : whatIfScore - STUB.trendCutoff >= -10 ? 'Moderate' : 'Low';

  const oddsColor = ODDS_COLOR[STUB.oddsLabel] ?? palette.warning;

  return (
    <View style={[s.wrap, { backgroundColor: c.surfacePrimary }]}>
      <AppHeader title="Premium Analytics" variant="stack" />

      <ScrollView
        contentContainerStyle={[s.body, { paddingBottom: insets.bottom + spacing['2xl'] }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Demo toggle (stub only — real builds gate on entitlement) */}
        <TouchableOpacity
          style={[s.demoPill, { borderColor: accent }]}
          onPress={() => { void toggle(); }}
          accessibilityRole="button"
          accessibilityLabel="Toggle premium preview"
        >
          <Ionicons name="flask-outline" size={12} color={accent} />
          <Text style={[s.demoText, { color: accent }]}>
            DEMO · {isPremium ? 'Unlocked — tap to lock' : 'Locked — tap to unlock'}
          </Text>
        </TouchableOpacity>

        {/* ① Odds (always visible — teaser when locked) */}
        <Card style={[s.card, { borderTopWidth: 2, borderTopColor: accent }]}>
          <Text style={[s.kicker, { color: c.textMuted }]}>YOUR ODDS · {STUB.category}</Text>
          <View style={s.gaugeWrap}>
            <OddsGauge fraction={STUB.oddsFraction} color={oddsColor} track={c.surfaceTertiary} />
            <View style={s.gaugeCenter}>
              <Text style={[s.oddsLabel, { color: oddsColor }]}>{STUB.oddsLabel}</Text>
              <Text style={[s.oddsTime, { color: c.textSecondary }]}>{STUB.timeframe}</Text>
            </View>
          </View>
          <View style={[s.compareRow, { borderTopColor: c.border }]}>
            <Text style={[s.compareText, { color: c.textSecondary }]}>
              Your <Text style={[s.num, { color: c.textPrimary }]}>{STUB.userScore}</Text>
            </Text>
            <View style={[s.vDiv, { backgroundColor: c.border }]} />
            <Text style={[s.compareText, { color: c.textSecondary }]}>
              Trend cutoff <Text style={[s.num, { color: c.textPrimary }]}>~{STUB.trendCutoff}</Text>
            </Text>
          </View>
        </Card>

        {isPremium ? (
          <PremiumBody c={c} accent={accent}
            age={age} setAge={setAge} clb={clb} setClb={setClb}
            french={french} setFrench={setFrench} pnp={pnp} setPnp={setPnp}
            whatIfScore={whatIfScore} whatIfLabel={whatIfLabel} />
        ) : (
          <LockedRegion c={c} accent={accent} onUnlock={() => { void toggle(); }} />
        )}

        <Text style={[s.disclaimer, { color: c.textMuted }]}>
          Estimates, not guarantees. Based on historical IRCC draw data and your profile. IRCC draws
          are unpredictable — always verify with the official tools.
        </Text>
      </ScrollView>
    </View>
  );
}

// ─── Unlocked body (cards ②–⑦) ───────────────────────────────────────────────
function PremiumBody({
  c, accent, age, setAge, clb, setClb, french, setFrench, pnp, setPnp, whatIfScore, whatIfLabel,
}: any) {
  return (
    <>
      {/* ② Score-gap coach */}
      <Card style={s.card}>
        <View style={s.rowBetween}>
          <Text style={[s.kicker, { color: c.textMuted }]}>HOW TO IMPROVE</Text>
          <Text style={[s.gapBadge, { color: accent }]}>+{STUB.gapPoints} to “{STUB.gapTo}”</Text>
        </View>
        {STUB.paths.map((p, i) => (
          <View key={p.label} style={[s.gapRow, i > 0 && { borderTopColor: c.border, borderTopWidth: StyleSheet.hairlineWidth }]}>
            <Ionicons name="arrow-up-circle-outline" size={16} color={accent} />
            <Text style={[s.gapLabel, { color: c.textPrimary }]}>{p.label}</Text>
            <Text style={[s.gapDelta, { color: palette.success }]}>{p.delta}</Text>
          </View>
        ))}
      </Card>

      {/* ③ Forecast */}
      <Card style={s.card}>
        <Text style={[s.kicker, { color: c.textMuted }]}>FORECAST · NEXT {STUB.category.toUpperCase()} DRAW</Text>
        <ForecastBandChart
          actual={STUB.forecast.actual} forecast={STUB.forecast.proj} band={STUB.forecast.band}
          min={STUB.forecast.min} max={STUB.forecast.max}
          lineColor={accent} bandColor={accent + '26'} gridColor={c.border}
        />
        <Text style={[s.caption, { color: c.textSecondary }]}>
          Likely <Text style={[s.num, { color: c.textPrimary }]}>{STUB.forecast.likely}</Text> · confidence {STUB.forecast.confidence.toLowerCase()}
        </Text>
      </Card>

      {/* ④ What-if simulator */}
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
          <Text style={[s.whatIfOutText, { color: ODDS_COLOR[whatIfLabel] ?? accent }]}>
            Projected odds: {whatIfLabel}
          </Text>
        </View>
      </Card>

      {/* ⑤ Cutoff trend (multi-category stub: single series + MA) */}
      <Card style={s.card}>
        <Text style={[s.kicker, { color: c.textMuted }]}>CUTOFF TREND · LAST {STUB.trend.length} DRAWS</Text>
        <ForecastBandChart
          actual={STUB.trend} forecast={[STUB.trend[STUB.trend.length - 1]!]} band={[{ lo: 0, hi: 0 }]}
          min={495} max={535} lineColor={accent} bandColor="transparent" gridColor={c.border} height={110}
        />
        <Text style={[s.caption, { color: c.textMuted }]}>Solid = cutoff · tap chips (soon) to compare categories</Text>
      </Card>

      {/* ⑥ Cadence + volume */}
      <View style={s.miniRow}>
        <Card style={s.miniCard}>
          <Text style={[s.kicker, { color: c.textMuted }]}>DRAW CADENCE</Text>
          <MiniBars values={STUB.cadence} color={accent} track={c.surfaceTertiary} />
          <Text style={[s.caption, { color: c.textSecondary }]}>~every <Text style={[s.num, { color: c.textPrimary }]}>{STUB.cadenceDays}</Text> days</Text>
        </Card>
        <Card style={s.miniCard}>
          <Text style={[s.kicker, { color: c.textMuted }]}>INVITATIONS</Text>
          <MiniBars values={STUB.volume} color={palette.success} track={c.surfaceTertiary} />
          <Text style={[s.caption, { color: c.textSecondary }]}><Text style={[s.num, { color: c.textPrimary }]}>{STUB.invitationsYtd}</Text> YTD</Text>
        </Card>
      </View>

      {/* ⑦ Percentile */}
      <Card style={s.card}>
        <Text style={[s.kicker, { color: c.textMuted }]}>PERCENTILE</Text>
        <Text style={[s.percentileText, { color: c.textPrimary }]}>
          Your {STUB.userScore} beats {STUB.percentile}% of the last 12 months’ cutoffs
        </Text>
        <View style={{ marginTop: spacing.sm }}>
          <MarkerBar fraction={STUB.percentile / 100} color={accent} track={c.surfaceTertiary} />
        </View>
      </Card>
    </>
  );
}

// ─── Locked region (scrim + unlock sheet) ─────────────────────────────────────
function LockedRegion({ c, accent, onUnlock }: any) {
  return (
    <View style={s.lockedWrap}>
      {/* Dimmed, non-interactive preview behind the sheet */}
      <View style={s.lockedPreview} pointerEvents="none">
        <Card style={s.card}>
          <Text style={[s.kicker, { color: c.textMuted }]}>HOW TO IMPROVE</Text>
          <View style={s.gapRow}><Ionicons name="arrow-up-circle-outline" size={16} color={accent} /><Text style={[s.gapLabel, { color: c.textPrimary }]}>French (NCLC 7+)</Text><Text style={[s.gapDelta, { color: palette.success }]}>+50</Text></View>
          <View style={s.gapRow}><Ionicons name="arrow-up-circle-outline" size={16} color={accent} /><Text style={[s.gapLabel, { color: c.textPrimary }]}>Listening → CLB 9</Text><Text style={[s.gapDelta, { color: palette.success }]}>+6</Text></View>
        </Card>
        <Card style={s.card}>
          <Text style={[s.kicker, { color: c.textMuted }]}>FORECAST</Text>
          <ForecastBandChart actual={STUB.forecast.actual} forecast={STUB.forecast.proj} band={STUB.forecast.band}
            min={STUB.forecast.min} max={STUB.forecast.max} lineColor={accent} bandColor={accent + '26'} gridColor={c.border} />
        </Card>
      </View>

      {/* Scrim + unlock sheet */}
      <View style={[s.scrim, { backgroundColor: c.surfacePrimary + 'D9' }]} />
      <Card style={[s.unlockSheet, { borderColor: accent + '40' }]}>
        <View style={[s.lockBadge, { backgroundColor: accent + '18' }]}>
          <Ionicons name="lock-closed" size={20} color={accent} />
        </View>
        <Text style={[s.unlockTitle, { color: c.textPrimary }]}>Unlock Premium Insights</Text>
        {[
          ['analytics-outline', 'Personalized invitation odds'],
          ['trending-up-outline', 'Score-gap coaching & paths'],
          ['pulse-outline', 'Cutoff forecasts per category'],
          ['options-outline', 'What-if score simulator'],
        ].map(([icon, label]) => (
          <View key={label} style={s.benefitRow}>
            <Ionicons name={icon as any} size={15} color={accent} />
            <Text style={[s.benefitText, { color: c.textSecondary }]}>{label}</Text>
          </View>
        ))}
        <TouchableOpacity
          style={[s.cta, { backgroundColor: accent }]}
          onPress={onUnlock}
          accessibilityRole="button"
          accessibilityLabel="Unlock premium"
        >
          <Text style={s.ctaText}>Unlock · CA$3.99/mo</Text>
        </TouchableOpacity>
        <Text style={[s.ctaAlt, { color: c.textSecondary }]}>or CA$19.99/yr · save 58%</Text>
        <Text style={[s.restore, { color: c.textMuted }]}>Restore purchase</Text>
        <Text style={[s.demoNote, { color: c.textMuted }]}>(Demo: button just toggles the preview — no billing yet)</Text>
      </Card>
    </View>
  );
}

// ─── Small form rows ──────────────────────────────────────────────────────────
function SliderRow({ c, accent, label, value, min, max, step, onChange, display }: any) {
  return (
    <View style={s.sliderRow}>
      <View style={s.rowBetween}>
        <Text style={[s.sliderLabel, { color: c.textSecondary }]}>{label}</Text>
        <Text style={[s.sliderVal, { color: c.textPrimary }]}>{display}</Text>
      </View>
      <Slider
        minimumValue={min} maximumValue={max} step={step} value={value}
        onValueChange={onChange}
        minimumTrackTintColor={accent} maximumTrackTintColor={c.surfaceTertiary} thumbTintColor={accent}
      />
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
  wrap: { flex: 1 },
  body: { padding: spacing.base, paddingTop: spacing.md, gap: spacing.sm },

  demoPill: {
    alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1, borderRadius: 999, paddingHorizontal: spacing.md, paddingVertical: 5, marginBottom: spacing.xs,
  },
  demoText: { fontSize: typography.xs, fontWeight: typography.bold, letterSpacing: 0.4 },

  card: { gap: spacing.xs },
  kicker: { fontSize: typography.xs, fontWeight: typography.bold, letterSpacing: 0.8 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  num: { fontWeight: typography.bold, ...TAB },
  caption: { fontSize: typography.xs, lineHeight: 16, marginTop: 2 },

  // Odds
  gaugeWrap: { alignItems: 'center', marginTop: spacing.xs },
  gaugeCenter: { position: 'absolute', bottom: 0, alignItems: 'center' },
  oddsLabel: { fontSize: typography['2xl'], fontWeight: typography.black, letterSpacing: -0.5 },
  oddsTime: { fontSize: typography.xs, marginTop: 1 },
  compareRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md,
                borderTopWidth: StyleSheet.hairlineWidth, marginTop: spacing.sm, paddingTop: spacing.sm },
  compareText: { fontSize: typography.sm },
  vDiv: { width: 1, height: 16 },

  // Gap
  gapBadge: { fontSize: typography.xs, fontWeight: typography.bold },
  gapRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  gapLabel: { flex: 1, fontSize: typography.sm, fontWeight: typography.medium },
  gapDelta: { fontSize: typography.sm, fontWeight: typography.bold, ...TAB },

  // What-if
  whatIfScore: { fontSize: typography.xl, fontWeight: typography.black, ...TAB },
  sliderRow: { marginTop: spacing.xs },
  sliderLabel: { fontSize: typography.sm },
  sliderVal: { fontSize: typography.sm, fontWeight: typography.bold, ...TAB },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
               borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.sm, marginTop: spacing.xs },
  whatIfOut: { borderRadius: borderRadius.md, paddingVertical: spacing.sm, alignItems: 'center', marginTop: spacing.sm },
  whatIfOutText: { fontSize: typography.sm, fontWeight: typography.bold },

  // Mini row
  miniRow: { flexDirection: 'row', gap: spacing.sm },
  miniCard: { flex: 1, gap: spacing.xs },

  // Percentile
  percentileText: { fontSize: typography.sm, lineHeight: 20, fontWeight: typography.medium },

  // Locked
  lockedWrap: { position: 'relative' },
  lockedPreview: { gap: spacing.sm, opacity: 0.5 },
  scrim: { ...StyleSheet.absoluteFillObject, borderRadius: borderRadius.md },
  unlockSheet: { position: 'absolute', left: spacing.lg, right: spacing.lg, top: spacing.lg,
                 alignItems: 'center', gap: spacing.xs, borderWidth: 1, paddingVertical: spacing.lg },
  lockBadge: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  unlockTitle: { fontSize: typography.lg, fontWeight: typography.bold, marginBottom: spacing.xs },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, alignSelf: 'stretch' },
  benefitText: { fontSize: typography.sm },
  cta: { alignSelf: 'stretch', borderRadius: borderRadius.md, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.md },
  ctaText: { color: '#fff', fontSize: typography.base, fontWeight: typography.bold },
  ctaAlt: { fontSize: typography.sm, marginTop: spacing.xs },
  restore: { fontSize: typography.xs, marginTop: spacing.xs, textDecorationLine: 'underline' },
  demoNote: { fontSize: 10, marginTop: spacing.sm, textAlign: 'center' },

  disclaimer: { fontSize: typography.xs, lineHeight: 16, textAlign: 'center', paddingHorizontal: spacing.sm, marginTop: spacing.sm },
});
