import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { palette, spacing, typography, borderRadius } from '@/theme';
import { useColors } from '@/hooks/useColors';
import { useAccentColor } from '@/hooks/useAccentColor';
import {
  calculateSinp,
  SINP_MAX_SCORE,
  SINP_PASS_MARK,
  type SinpAgeBand,
  type SinpClb,
  type SinpEducation,
  type SinpInput,
} from '../utils/sinpCalculator';

// ─── Options ──────────────────────────────────────────────────────────────────

const EDUCATION_OPTIONS: { label: string; value: SinpEducation; pts: number }[] = [
  { label: "Master's or PhD",                         value: 'masters_phd', pts: 23 },
  { label: "Bachelor's degree (3+ years)",            value: 'bachelors',   pts: 20 },
  { label: 'Trade certificate (journeyperson)',       value: 'trade_cert',  pts: 20 },
  { label: 'Diploma — 2+ academic years',             value: 'diploma_2yr', pts: 15 },
  { label: 'Certificate / diploma — 1 academic year', value: 'diploma_1yr', pts: 12 },
  { label: 'None of the above',                       value: 'none',        pts: 0 },
];

const AGE_OPTIONS: { label: string; value: SinpAgeBand; pts: number }[] = [
  { label: 'Under 18', value: 'under18', pts: 0 },
  { label: '18–21',    value: '18_21',   pts: 8 },
  { label: '22–34',    value: '22_34',   pts: 12 },
  { label: '35–45',    value: '35_45',   pts: 10 },
  { label: '46–50',    value: '46_50',   pts: 8 },
  { label: 'Over 50',  value: 'over50',  pts: 0 },
];

const LANGUAGE_OPTIONS: { label: string; value: SinpClb; pts: number }[] = [
  { label: 'CLB 8 or higher', value: 'clb8plus', pts: 20 },
  { label: 'CLB 7',           value: 'clb7',     pts: 18 },
  { label: 'CLB 6',           value: 'clb6',     pts: 16 },
  { label: 'CLB 5',           value: 'clb5',     pts: 14 },
  { label: 'CLB 4',           value: 'clb4',     pts: 12 },
  { label: 'Below CLB 4',     value: 'below4',   pts: 0 },
];

const SECOND_LANGUAGE_OPTIONS: { label: string; value: SinpClb; pts: number }[] = [
  { label: 'CLB 8 or higher',    value: 'clb8plus', pts: 10 },
  { label: 'CLB 7',              value: 'clb7',     pts: 8 },
  { label: 'CLB 6',              value: 'clb6',     pts: 6 },
  { label: 'CLB 5',              value: 'clb5',     pts: 4 },
  { label: 'CLB 4',              value: 'clb4',     pts: 2 },
  { label: 'No second language', value: 'below4',   pts: 0 },
];

const YEAR_OPTIONS = [0, 1, 2, 3, 4, 5];

const CONNECTION_OPTIONS: { key: keyof Pick<SinpInput, 'hasSaskJobOffer' | 'hasSaskFamily' | 'hasSaskWorkExp' | 'hasSaskStudy'>; label: string; hint: string; pts: number }[] = [
  { key: 'hasSaskJobOffer', label: 'Saskatchewan job offer',  hint: 'High-skilled employment offer from a SK employer', pts: 30 },
  { key: 'hasSaskFamily',   label: 'Close family in SK',      hint: 'Close relative who is a citizen or PR living in SK', pts: 20 },
  { key: 'hasSaskWorkExp',  label: 'Past SK work experience', hint: 'At least 12 months in the past 5 years',            pts: 5 },
  { key: 'hasSaskStudy',    label: 'Past SK study',           hint: 'At least 1 full-time academic year in SK',          pts: 5 },
];

const DEFAULT_INPUT: SinpInput = {
  education: 'bachelors',
  age: '22_34',
  language: 'clb8plus',
  secondLanguage: 'below4',
  workRecentYears: 0,
  workEarlierYears: 0,
  hasSaskJobOffer: false,
  hasSaskFamily: false,
  hasSaskWorkExp: false,
  hasSaskStudy: false,
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SinpCalculatorScreen() {
  const c = useColors();
  const accent = useAccentColor();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [input, setInput] = useState<SinpInput>(DEFAULT_INPUT);

  const result = useMemo(() => calculateSinp(input), [input]);
  const set = <K extends keyof SinpInput>(key: K, value: SinpInput[K]) =>
    setInput((prev) => ({ ...prev, [key]: value }));

  const scoreColor = result.pass ? palette.success : palette.warning;

  const breakdownRows = [
    { label: 'Education',        pts: result.education,      max: 23 },
    { label: 'Work Experience',  pts: result.workExperience, max: 15 },
    { label: 'Language',         pts: result.language,       max: 30 },
    { label: 'Age',              pts: result.age,            max: 12 },
    { label: 'SK Connection',    pts: result.connection,     max: 30 },
  ];

  const renderOptions = <T extends string>(
    options: { label: string; value: T; pts: number }[],
    selected: T,
    onSelect: (v: T) => void,
  ) =>
    options.map((opt) => {
      const active = selected === opt.value;
      return (
        <TouchableOpacity
          key={opt.value}
          style={[
            s.option,
            { borderColor: c.border, backgroundColor: c.surfaceSecondary },
            active && { borderColor: accent, backgroundColor: accent + '18' },
          ]}
          onPress={() => onSelect(opt.value)}
          activeOpacity={0.65}
        >
          <Text style={[s.optionLabel, { color: active ? c.textPrimary : c.textSecondary }]}>
            {opt.label}
          </Text>
          <Text style={[s.optionPts, { color: active ? accent : c.textMuted }]}>{opt.pts} pts</Text>
        </TouchableOpacity>
      );
    });

  const renderYearChips = (selected: number, onSelect: (v: number) => void) => (
    <View style={s.chipRow}>
      {YEAR_OPTIONS.map((y) => {
        const active = selected === y;
        return (
          <TouchableOpacity
            key={y}
            style={[
              s.chip,
              { borderColor: c.border, backgroundColor: c.surfaceSecondary },
              active && { borderColor: accent, backgroundColor: accent + '18' },
            ]}
            onPress={() => onSelect(y)}
            activeOpacity={0.65}
          >
            <Text style={[s.chipText, { color: active ? accent : c.textSecondary }]}>
              {y === 5 ? '5' : String(y)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <View style={[s.wrap, { backgroundColor: c.surfacePrimary }]}>
      <View style={[s.topBar, { paddingTop: insets.top + spacing.sm, borderBottomColor: c.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={16} style={s.backBtn}>
          <Ionicons name="chevron-back" size={22} color={c.textPrimary} />
          <Text style={[s.backLabel, { color: c.textPrimary }]}>Back</Text>
        </TouchableOpacity>
        <Text style={[s.title, { color: c.textPrimary }]}>SINP Calculator</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        contentContainerStyle={[s.body, { paddingBottom: insets.bottom + spacing['2xl'] }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Score hero */}
        <View style={[s.card, { borderColor: c.border, backgroundColor: c.surfaceCard }]}>
          <View style={s.scoreHero}>
            <Text style={[s.scoreNum, { color: scoreColor }]}>{result.total}</Text>
            <Text style={[s.scoreOutOf, { color: c.textMuted }]}>/ {SINP_MAX_SCORE} points</Text>
            <View style={[s.passBadge, { backgroundColor: scoreColor + '1A', borderColor: scoreColor + '50' }]}>
              <Ionicons
                name={result.pass ? 'checkmark-circle' : 'alert-circle-outline'}
                size={15}
                color={scoreColor}
              />
              <Text style={[s.passText, { color: scoreColor }]}>
                {result.pass
                  ? `Meets ${SINP_PASS_MARK}-point minimum`
                  : `${SINP_PASS_MARK - result.total} points below minimum`}
              </Text>
            </View>
          </View>
          <View style={s.breakdown}>
            {breakdownRows.map((row) => (
              <View key={row.label} style={s.breakdownRow}>
                <Text style={[s.bLabel, { color: c.textMuted }]}>{row.label}</Text>
                <Text style={[s.bValue, { color: c.textPrimary }]}>
                  {row.pts}<Text style={{ color: c.textMuted }}> / {row.max}</Text>
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Education */}
        <View style={[s.card, { borderColor: c.border, backgroundColor: c.surfaceCard }]}>
          <Text style={[s.sectionTitle, { color: c.textPrimary }]}>Education & Training</Text>
          {renderOptions(EDUCATION_OPTIONS, input.education, (v) => set('education', v))}
        </View>

        {/* Language */}
        <View style={[s.card, { borderColor: c.border, backgroundColor: c.surfaceCard }]}>
          <Text style={[s.sectionTitle, { color: c.textPrimary }]}>Language Ability</Text>
          <Text style={[s.hint, { color: c.textSecondary }]}>
            First language — lowest CLB level across all four skills of your test:
          </Text>
          {renderOptions(LANGUAGE_OPTIONS, input.language, (v) => set('language', v))}
          <Text style={[s.hint, { color: c.textSecondary, marginTop: spacing.sm }]}>
            Second official language (English or French), if tested:
          </Text>
          {renderOptions(SECOND_LANGUAGE_OPTIONS, input.secondLanguage, (v) => set('secondLanguage', v))}
        </View>

        {/* Age */}
        <View style={[s.card, { borderColor: c.border, backgroundColor: c.surfaceCard }]}>
          <Text style={[s.sectionTitle, { color: c.textPrimary }]}>Age</Text>
          {renderOptions(AGE_OPTIONS, input.age, (v) => set('age', v))}
        </View>

        {/* Work experience */}
        <View style={[s.card, { borderColor: c.border, backgroundColor: c.surfaceCard }]}>
          <Text style={[s.sectionTitle, { color: c.textPrimary }]}>Skilled Work Experience</Text>
          <Text style={[s.hint, { color: c.textSecondary }]}>
            Years worked in the field of your education, within the 5 years before applying (2 pts/year):
          </Text>
          {renderYearChips(input.workRecentYears, (v) => set('workRecentYears', v))}
          <Text style={[s.hint, { color: c.textSecondary, marginTop: spacing.sm }]}>
            Years worked 6–10 years before applying (1 pt/year after the first):
          </Text>
          {renderYearChips(input.workEarlierYears, (v) => set('workEarlierYears', v))}
        </View>

        {/* Saskatchewan connection */}
        <View style={[s.card, { borderColor: c.border, backgroundColor: c.surfaceCard }]}>
          <Text style={[s.sectionTitle, { color: c.textPrimary }]}>Saskatchewan Connection</Text>
          <Text style={[s.hint, { color: c.textSecondary }]}>Capped at 30 points total.</Text>
          {CONNECTION_OPTIONS.map((opt) => (
            <View key={opt.key} style={s.switchRow}>
              <View style={s.switchText}>
                <Text style={[s.switchLabel, { color: c.textPrimary }]}>
                  {opt.label} <Text style={{ color: accent }}>+{opt.pts}</Text>
                </Text>
                <Text style={[s.switchHint, { color: c.textMuted }]}>{opt.hint}</Text>
              </View>
              <Switch
                value={input[opt.key]}
                onValueChange={(v) => set(opt.key, v)}
                trackColor={{ false: c.surfaceTertiary, true: accent }}
                thumbColor={palette.white}
              />
            </View>
          ))}
        </View>

        {/* Disclaimer */}
        <Text style={[s.disclaimer, { color: c.textMuted }]}>
          Estimate based on the SINP International Skilled Worker points grid. Eligibility also
          requires an in-demand occupation, ECA, and licensure where applicable. Always verify with
          the official SINP assessment on saskatchewan.ca.
        </Text>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  wrap:      { flex: 1 },
  topBar:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
               paddingHorizontal: spacing.base, paddingBottom: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn:   { flexDirection: 'row', alignItems: 'center', gap: 2, width: 60 },
  backLabel: { fontSize: typography.base, fontWeight: typography.medium },
  title:     { fontSize: typography.base, fontWeight: typography.semibold, flex: 1, textAlign: 'center' },
  body:      { padding: spacing.base, paddingTop: spacing.lg, gap: spacing.sm },

  card: {
    borderWidth: StyleSheet.hairlineWidth, borderRadius: borderRadius.md,
    padding: spacing.md, gap: spacing.xs,
  },
  sectionTitle: { fontSize: typography.base, fontWeight: typography.bold, marginBottom: spacing.xs },
  hint:         { fontSize: typography.sm, lineHeight: 19 },

  // Score hero
  scoreHero:  { alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.sm },
  scoreNum:   { fontSize: 52, fontWeight: typography.black, letterSpacing: -2, lineHeight: 58 },
  scoreOutOf: { fontSize: typography.sm, fontWeight: typography.semibold },
  passBadge:  { flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
                paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
                borderRadius: borderRadius.md, borderWidth: 0.5 },
  passText:   { fontSize: typography.sm, fontWeight: typography.semibold },

  breakdown:    { marginTop: spacing.sm, gap: spacing.xs },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bLabel:       { fontSize: typography.sm, fontWeight: typography.medium },
  bValue:       { fontSize: typography.sm, fontWeight: typography.bold },

  // Option rows
  option: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md, borderWidth: 1,
  },
  optionLabel: { flex: 1, fontSize: typography.sm, fontWeight: typography.semibold },
  optionPts:   { fontSize: typography.xs, fontWeight: typography.bold },

  // Year chips
  chipRow:  { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs },
  chip: {
    flex: 1, alignItems: 'center', paddingVertical: spacing.sm,
    borderRadius: borderRadius.md, borderWidth: 1,
  },
  chipText: { fontSize: typography.sm, fontWeight: typography.bold },

  // Connection switches
  switchRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                 gap: spacing.md, paddingVertical: spacing.xs + 2 },
  switchText:  { flex: 1, gap: 2 },
  switchLabel: { fontSize: typography.sm, fontWeight: typography.semibold },
  switchHint:  { fontSize: typography.xs, lineHeight: 16 },

  disclaimer: { fontSize: typography.xs, lineHeight: 18, textAlign: 'center',
                paddingHorizontal: spacing.sm, marginTop: spacing.xs },
});
