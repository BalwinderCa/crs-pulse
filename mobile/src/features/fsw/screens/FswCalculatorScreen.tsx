import { useTranslation } from 'react-i18next';
import { useMemo } from 'react';
import { useCalculatorsStore } from '@/store/calculatorsStore';
import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { palette, spacing, typography, borderRadius } from '@/theme';
import { useColors } from '@/hooks/useColors';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { AppHeader } from '@/components/layout/AppHeader';
import {
  calculateFsw,
  FSW_MAX_SCORE,
  FSW_PASS_MARK,
  type FswClb,
  type FswEducation,
  type FswInput,
  type FswWorkYears,
} from '../utils/fswCalculator';

// ─── Options ──────────────────────────────────────────────────────────────────

const CLB_OPTIONS: { label: string; value: FswClb }[] = [
  { label: 'CLB 9+',    value: 'clb9plus' },
  { label: 'CLB 8',     value: 'clb8' },
  { label: 'CLB 7',     value: 'clb7' },
  { label: 'Below 7',   value: 'below7' },
];

const EDUCATION_OPTIONS: { label: string; value: FswEducation; pts: number }[] = [
  { label: 'PhD (doctorate)',                              value: 'phd',                  pts: 25 },
  { label: "Master's or professional degree",              value: 'masters_professional', pts: 23 },
  { label: 'Two or more credentials (one 3+ years)',       value: 'two_or_more',          pts: 22 },
  { label: "Bachelor's / 3-year post-secondary",           value: 'bachelors_3yr',        pts: 21 },
  { label: '2-year post-secondary',                        value: 'diploma_2yr',          pts: 19 },
  { label: '1-year post-secondary',                        value: 'diploma_1yr',          pts: 15 },
  { label: 'High school',                                  value: 'secondary',            pts: 5 },
];

const WORK_OPTIONS: { label: string; value: FswWorkYears; pts: number }[] = [
  { label: 'None',      value: 'none',  pts: 0 },
  { label: '1 year',    value: '1',     pts: 9 },
  { label: '2–3 years', value: '2_3',   pts: 11 },
  { label: '4–5 years', value: '4_5',   pts: 13 },
  { label: '6+ years',  value: '6plus', pts: 15 },
];

const ABILITIES = ['speaking', 'listening', 'reading', 'writing'] as const;

const ADAPT_OPTIONS: { key: keyof Pick<FswInput,
  'spouseLangClb4' | 'studiedInCanada' | 'spouseStudiedInCanada' |
  'workedInCanada' | 'spouseWorkedInCanada' | 'hasRelativeInCanada'>;
  label: string; hint: string; pts: number }[] = [
  { key: 'workedInCanada',        label: 'You worked in Canada',          hint: '1+ year skilled work (TEER 0–3)',            pts: 10 },
  { key: 'studiedInCanada',       label: 'You studied in Canada',         hint: '2+ academic years full-time',                pts: 5 },
  { key: 'hasRelativeInCanada',   label: 'Relative in Canada',            hint: 'Parent, sibling, grandparent, aunt/uncle, niece/nephew — citizen or PR', pts: 5 },
  { key: 'spouseLangClb4',        label: "Spouse's language CLB 4+",      hint: 'All four abilities',                         pts: 5 },
  { key: 'spouseStudiedInCanada', label: 'Spouse studied in Canada',      hint: '2+ academic years full-time',                pts: 5 },
  { key: 'spouseWorkedInCanada',  label: 'Spouse worked in Canada',       hint: '1+ year full-time',                          pts: 5 },
];

const DEFAULT_INPUT: FswInput = {
  age: 30,
  education: 'bachelors_3yr',
  firstLang: { speaking: 'clb8', listening: 'clb8', reading: 'clb8', writing: 'clb8' },
  secondLangClb5: false,
  workYears: '1',
  hasArrangedEmployment: false,
  spouseLangClb4: false,
  studiedInCanada: false,
  spouseStudiedInCanada: false,
  workedInCanada: false,
  spouseWorkedInCanada: false,
  hasRelativeInCanada: false,
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function FswCalculatorScreen() {
  const c = useColors();
  const accent = useAccentColor();
  const insets = useSafeAreaInsets();
  const { contentFrameStyle } = useResponsiveLayout();
  const { t } = useTranslation();
  const input = useCalculatorsStore((s) => s.fsw) ?? DEFAULT_INPUT;
  const setFsw = useCalculatorsStore((s) => s.setFsw);
  const setInput = (u: FswInput | ((prev: FswInput) => FswInput)) =>
    setFsw(typeof u === 'function' ? u(input) : u);

  const result = useMemo(() => calculateFsw(input), [input]);
  const set = <K extends keyof FswInput>(key: K, value: FswInput[K]) =>
    setInput((prev) => ({ ...prev, [key]: value }));
  const setAbility = (ability: (typeof ABILITIES)[number], value: FswClb) =>
    setInput((prev) => ({ ...prev, firstLang: { ...prev.firstLang, [ability]: value } }));

  const scoreColor = result.pass ? palette.success : palette.warning;

  const breakdownRows = [
    { label: t('fswCalculator.language'),            pts: result.language,           max: 28 },
    { label: t('fswCalculator.education'),           pts: result.education,          max: 25 },
    { label: t('fswCalculator.workExperience'),      pts: result.workExperience,     max: 15 },
    { label: t('fswCalculator.age'),                 pts: result.age,                max: 12 },
    { label: t('fswCalculator.arrangedEmployment'),  pts: result.arrangedEmployment, max: 10 },
    { label: t('fswCalculator.adaptability'),        pts: result.adaptability,       max: 10 },
  ];

  return (
    <View style={[s.wrap, { backgroundColor: c.surfacePrimary }]}>
      <AppHeader title={t('fswCalculator.title')} variant="stack" />

      <ScrollView
        contentContainerStyle={[s.body, contentFrameStyle, { paddingBottom: insets.bottom + spacing['2xl'] }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Score hero */}
        <View style={[s.card, { borderColor: c.border, backgroundColor: c.surfaceCard }]}>
          <View style={s.scoreHero}>
            <Text style={[s.scoreNum, { color: scoreColor }]}>{result.total}</Text>
            <Text style={[s.scoreOutOf, { color: c.textMuted }]}>/ {FSW_MAX_SCORE} points</Text>
            <View style={[s.passBadge, { backgroundColor: scoreColor + '1A', borderColor: scoreColor + '50' }]}>
              <Ionicons
                name={result.pass ? 'checkmark-circle' : 'alert-circle-outline'}
                size={15}
                color={scoreColor}
              />
              <Text style={[s.passText, { color: scoreColor }]}>
                {result.pass
                  ? t('fswCalculator.eligible', { min: FSW_PASS_MARK })
                  : result.total >= FSW_PASS_MARK
                    ? t('fswCalculator.notEligible')
                    : t('fswCalculator.belowMin', { points: FSW_PASS_MARK - result.total })}
              </Text>
            </View>
          </View>

          {!result.meetsLanguageMinimum && (
            <View style={[s.warnRow, { backgroundColor: palette.warningLight ?? palette.warning + '1A' }]}>
              <Ionicons name="warning-outline" size={14} color={palette.warning} />
              <Text style={[s.warnText, { color: palette.warning }]}>
                {t('fswCalculator.fswClb7Required')}
              </Text>
            </View>
          )}
          {!result.meetsWorkMinimum && (
            <View style={[s.warnRow, { backgroundColor: palette.warning + '1A' }]}>
              <Ionicons name="warning-outline" size={14} color={palette.warning} />
              <Text style={[s.warnText, { color: palette.warning }]}>
                {t('fswCalculator.fswOneYearRequired')}
              </Text>
            </View>
          )}

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

        {/* Age */}
        <View style={[s.card, { borderColor: c.border, backgroundColor: c.surfaceCard }]}>
          <Text style={[s.sectionTitle, { color: c.textPrimary }]}>{t('fswCalculator.age')}</Text>
          <View style={s.stepperRow}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t('fswCalculator.decrease')}
              style={[s.stepBtn, { borderColor: c.border, backgroundColor: c.surfaceSecondary }]}
              onPress={() => set('age', Math.max(17, input.age - 1))}
            >
              <Ionicons name="remove" size={20} color={accent} />
            </TouchableOpacity>
            <View style={s.stepValue}>
              <Text style={[s.stepNum, { color: c.textPrimary }]}>{input.age}</Text>
              <Text style={[s.stepUnit, { color: c.textMuted }]}>{t('fswCalculator.years')}</Text>
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t('fswCalculator.increase')}
              style={[s.stepBtn, { borderColor: c.border, backgroundColor: c.surfaceSecondary }]}
              onPress={() => set('age', Math.min(60, input.age + 1))}
            >
              <Ionicons name="add" size={20} color={accent} />
            </TouchableOpacity>
          </View>
          <Text style={[s.hint, { color: c.textSecondary }]}>
            {t('fswCalculator.ageFullPoints')}
          </Text>
        </View>

        {/* Education */}
        <View style={[s.card, { borderColor: c.border, backgroundColor: c.surfaceCard }]}>
          <Text style={[s.sectionTitle, { color: c.textPrimary }]}>{t('fswCalculator.education')}</Text>
          {EDUCATION_OPTIONS.map((opt) => {
            const active = input.education === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                accessibilityLabel={`${opt.label}, ${opt.pts} points`}
                style={[
                  s.option,
                  { borderColor: c.border, backgroundColor: c.surfaceSecondary },
                  active && { borderColor: accent, backgroundColor: accent + '18' },
                ]}
                onPress={() => set('education', opt.value)}
                activeOpacity={0.65}
              >
                <Text style={[s.optionLabel, { color: active ? c.textPrimary : c.textSecondary }]}>
                  {opt.label}
                </Text>
                <Text style={[s.optionPts, { color: active ? accent : c.textMuted }]}>{opt.pts} pts</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Language */}
        <View style={[s.card, { borderColor: c.border, backgroundColor: c.surfaceCard }]}>
          <Text style={[s.sectionTitle, { color: c.textPrimary }]}>{t('fswCalculator.language')}</Text>
          <Text style={[s.hint, { color: c.textSecondary }]}>
            CLB level per ability — 6 pts each at CLB 9+, 5 at CLB 8, 4 at CLB 7.
          </Text>
          {ABILITIES.map((ability) => (
            <View key={ability} style={s.abilityBlock}>
              <Text style={[s.abilityLabel, { color: c.textMuted }]}>{ability.toUpperCase()}</Text>
              <View style={s.chipRow}>
                {CLB_OPTIONS.map((opt) => {
                  const active = input.firstLang[ability] === opt.value;
                  const labelKey = `fswCalculator.${opt.value === 'clb9plus' ? 'clb9Plus' : opt.value}`;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: active }}
                      accessibilityLabel={t(labelKey)}
                      style={[
                        s.chip,
                        { borderColor: c.border, backgroundColor: c.surfaceSecondary },
                        active && { borderColor: accent, backgroundColor: accent + '18' },
                      ]}
                      onPress={() => setAbility(ability, opt.value)}
                      activeOpacity={0.65}
                    >
                      <Text style={[s.chipText, { color: active ? accent : c.textSecondary }]}>
                        {t(labelKey)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}
          <View style={s.switchRow}>
            <View style={s.switchText}>
              <Text style={[s.switchLabel, { color: c.textPrimary }]}>
                {t('fswCalculator.secondLanguageLabel')} <Text style={{ color: accent }}>+4</Text>
              </Text>
              <Text style={[s.switchHint, { color: c.textMuted }]}>CLB 5+ in all four abilities</Text>
            </View>
            <Switch
              value={input.secondLangClb5}
              onValueChange={(v) => set('secondLangClb5', v)}
              trackColor={{ false: c.surfaceTertiary, true: accent }}
              thumbColor={palette.white}
              accessibilityLabel={t('fswCalculator.secondLanguageLabel')}
            />
          </View>
        </View>

        {/* Work experience */}
        <View style={[s.card, { borderColor: c.border, backgroundColor: c.surfaceCard }]}>
          <Text style={[s.sectionTitle, { color: c.textPrimary }]}>{t('fswCalculator.workExperience')}</Text>
          <Text style={[s.hint, { color: c.textSecondary }]}>
            Continuous full-time (or equivalent) work in NOC TEER 0–3, within the last 10 years.
          </Text>
          <View style={s.chipRow}>
            {WORK_OPTIONS.map((opt) => {
              const active = input.workYears === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: active }}
                  accessibilityLabel={opt.label}
                  style={[
                    s.chip,
                    { borderColor: c.border, backgroundColor: c.surfaceSecondary },
                    active && { borderColor: accent, backgroundColor: accent + '18' },
                  ]}
                  onPress={() => set('workYears', opt.value)}
                  activeOpacity={0.65}
                >
                  <Text style={[s.chipText, { color: active ? accent : c.textSecondary }]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Arranged employment */}
        <View style={[s.card, { borderColor: c.border, backgroundColor: c.surfaceCard }]}>
          <Text style={[s.sectionTitle, { color: c.textPrimary }]}>{t('fswCalculator.arrangedEmployment')}</Text>
          <View style={s.switchRow}>
            <View style={s.switchText}>
              <Text style={[s.switchLabel, { color: c.textPrimary }]}>
                {t('fswCalculator.validJobOffer')} <Text style={{ color: accent }}>+10</Text>
              </Text>
              <Text style={[s.switchHint, { color: c.textMuted }]}>
                Full-time, NOC TEER 0–3, LMIA-supported or exempt — also adds +5 adaptability
              </Text>
            </View>
            <Switch
              value={input.hasArrangedEmployment}
              onValueChange={(v) => set('hasArrangedEmployment', v)}
              trackColor={{ false: c.surfaceTertiary, true: accent }}
              thumbColor={palette.white}
              accessibilityLabel={t('fswCalculator.validJobOffer')}
            />
          </View>
        </View>

        {/* Adaptability */}
        <View style={[s.card, { borderColor: c.border, backgroundColor: c.surfaceCard }]}>
          <Text style={[s.sectionTitle, { color: c.textPrimary }]}>{t('fswCalculator.adaptability')}</Text>
          <Text style={[s.hint, { color: c.textSecondary }]}>Capped at 10 points total.</Text>
          {ADAPT_OPTIONS.map((opt) => {
            const adaptLabel = opt.key === 'workedInCanada'
              ? t('fswCalculator.canadianWorkExp')
              : opt.key === 'studiedInCanada'
                ? t('fswCalculator.studyInCanada')
                : opt.key === 'hasRelativeInCanada'
                  ? t('fswCalculator.relativeInCanada')
                  : opt.label;
            return (
              <View key={opt.key} style={s.switchRow}>
                <View style={s.switchText}>
                  <Text style={[s.switchLabel, { color: c.textPrimary }]}>
                    {adaptLabel} <Text style={{ color: accent }}>+{opt.pts}</Text>
                  </Text>
                  <Text style={[s.switchHint, { color: c.textMuted }]}>{opt.hint}</Text>
                </View>
                <Switch
                  value={input[opt.key]}
                  onValueChange={(v) => set(opt.key, v)}
                  trackColor={{ false: c.surfaceTertiary, true: accent }}
                  thumbColor={palette.white}
                  accessibilityLabel={adaptLabel}
                />
              </View>
            );
          })}
        </View>

        <Text style={[s.disclaimer, { color: c.textMuted }]}>
          Estimate based on the IRCC FSW six selection factors. Eligibility also requires proof of
          funds (unless authorized to work in Canada with a valid job offer) and an ECA for foreign
          education. Verify with the official IRCC tool.
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

  scoreHero:  { alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.sm },
  scoreNum:   { fontSize: 52, fontWeight: typography.black, letterSpacing: -2, lineHeight: 58 },
  scoreOutOf: { fontSize: typography.sm, fontWeight: typography.semibold },
  passBadge:  { flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
                paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
                borderRadius: borderRadius.md, borderWidth: 0.5 },
  passText:   { fontSize: typography.sm, fontWeight: typography.semibold },

  warnRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs,
              borderRadius: borderRadius.md, padding: spacing.sm },
  warnText: { flex: 1, fontSize: typography.xs, lineHeight: 16, fontWeight: typography.semibold },

  breakdown:    { marginTop: spacing.sm, gap: spacing.xs },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bLabel:       { fontSize: typography.sm, fontWeight: typography.medium },
  bValue:       { fontSize: typography.sm, fontWeight: typography.bold },

  // Stepper
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xl },
  stepBtn: {
    width: 44, height: 44, borderRadius: borderRadius.md, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  stepValue: { alignItems: 'center', minWidth: 64 },
  stepNum:   { fontSize: typography['3xl'], fontWeight: typography.black, letterSpacing: -1 },
  stepUnit:  { fontSize: typography.xs, fontWeight: typography.medium },

  // Options / chips
  option: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md, borderWidth: 1,
  },
  optionLabel: { flex: 1, fontSize: typography.sm, fontWeight: typography.semibold },
  optionPts:   { fontSize: typography.xs, fontWeight: typography.bold },

  abilityBlock: { marginTop: spacing.xs },
  abilityLabel: { fontSize: typography.xs, fontWeight: typography.bold, letterSpacing: 0.6, marginBottom: 4 },
  chipRow:      { flexDirection: 'row', gap: spacing.xs },
  chip: {
    flex: 1, alignItems: 'center', paddingVertical: spacing.sm,
    borderRadius: borderRadius.md, borderWidth: 1,
  },
  chipText: { fontSize: typography.xs, fontWeight: typography.bold },

  switchRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                 gap: spacing.md, paddingVertical: spacing.xs + 2 },
  switchText:  { flex: 1, gap: 2 },
  switchLabel: { fontSize: typography.sm, fontWeight: typography.semibold },
  switchHint:  { fontSize: typography.xs, lineHeight: 16 },

  disclaimer: { fontSize: typography.xs, lineHeight: 18, textAlign: 'center',
                paddingHorizontal: spacing.sm, marginTop: spacing.xs },
});
