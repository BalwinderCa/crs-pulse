import { useTranslation } from 'react-i18next';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { palette, spacing, typography, borderRadius } from '@/theme';
import { useColors } from '@/hooks/useColors';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { useAccentColor } from '@/hooks/useAccentColor';
import { AppHeader } from '@/components/layout/AppHeader';
import {
  calculateSirs,
  sirsWagePoints,
  SIRS_MAX_SCORE,
  type SirsClb,
  type SirsEducation,
  type SirsEducationLocation,
  type SirsInput,
  type SirsRegion,
  type SirsWorkYears,
} from '../utils/sirsCalculator';

// ─── Options ──────────────────────────────────────────────────────────────────

const WORK_OPTIONS: { label: string; value: SirsWorkYears; pts: number }[] = [
  { label: 'None',      value: 'none',   pts: 0 },
  { label: '1–2 yrs',   value: '1_2',    pts: 4 },
  { label: '2–3 yrs',   value: '2_3',    pts: 8 },
  { label: '3–4 yrs',   value: '3_4',    pts: 12 },
  { label: '4–5 yrs',   value: '4_5',    pts: 16 },
  { label: '5+ yrs',    value: '5plus',  pts: 20 },
];

const EDUCATION_OPTIONS: { label: string; value: SirsEducation; pts: number }[] = [
  { label: 'Doctorate (PhD)',                  value: 'doctorate',     pts: 27 },
  { label: "Master's degree",                  value: 'masters',       pts: 22 },
  { label: 'Post-graduate certificate/diploma', value: 'postgrad_cert', pts: 15 },
  { label: "Bachelor's degree",                value: 'bachelors',     pts: 15 },
  { label: 'Associate degree',                 value: 'associate',     pts: 5 },
  { label: 'Post-secondary diploma/certificate', value: 'diploma_cert', pts: 5 },
  { label: 'High school or less',              value: 'secondary',     pts: 0 },
];

const EDU_LOCATION_OPTIONS: { label: string; value: SirsEducationLocation; pts: number }[] = [
  { label: 'In B.C.',             value: 'bc',      pts: 8 },
  { label: 'Elsewhere in Canada', value: 'canada',  pts: 6 },
  { label: 'Outside Canada',      value: 'outside', pts: 0 },
];

const LANGUAGE_OPTIONS: { label: string; value: SirsClb; pts: number }[] = [
  { label: 'CLB 9 or higher', value: 'clb9plus', pts: 30 },
  { label: 'CLB 8',           value: 'clb8',     pts: 25 },
  { label: 'CLB 7',           value: 'clb7',     pts: 20 },
  { label: 'CLB 6',           value: 'clb6',     pts: 15 },
  { label: 'CLB 5',           value: 'clb5',     pts: 10 },
  { label: 'CLB 4',           value: 'clb4',     pts: 5 },
  { label: 'Below CLB 4',     value: 'below4',   pts: 0 },
];

const REGION_OPTIONS: { label: string; value: SirsRegion; pts: number }[] = [
  { label: 'Metro Vancouver',                                    value: 'metro_vancouver', pts: 0 },
  { label: 'Squamish, Abbotsford, Agassiz, Mission, Chilliwack', value: 'area2',           pts: 5 },
  { label: 'Anywhere else in B.C.',                              value: 'area3',           pts: 15 },
];

const DEFAULT_INPUT: SirsInput = {
  workYears: '2_3',
  hasCanadianExp: false,
  currentlyWorkingInJob: false,
  education: 'bachelors',
  educationLocation: 'outside',
  hasTradesOrProfessionalCert: false,
  language: 'clb8',
  bothOfficialLanguages: false,
  hourlyWage: 30,
  region: 'metro_vancouver',
  hasRegionalExperience: false,
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function BcSirsCalculatorScreen() {
  const c = useColors();
  const accent = useAccentColor();
  const insets = useSafeAreaInsets();
  const { contentFrameStyle } = useResponsiveLayout();
  const { t } = useTranslation();
  const [input, setInput] = useState<SirsInput>(DEFAULT_INPUT);
  const [wageText, setWageText] = useState(String(DEFAULT_INPUT.hourlyWage));

  const result = useMemo(() => calculateSirs(input), [input]);
  const set = <K extends keyof SirsInput>(key: K, value: SirsInput[K]) =>
    setInput((prev) => ({ ...prev, [key]: value }));

  const onWageChange = (text: string) => {
    setWageText(text.replace(/[^0-9.]/g, ''));
    const parsed = parseFloat(text);
    set('hourlyWage', Number.isFinite(parsed) ? parsed : 0);
  };

  const breakdownRows = [
    { label: t('bcpnpCalculator.workExperience'),    pts: result.workExperience, max: 40 },
    { label: t('bcpnpCalculator.education'),          pts: result.education,      max: 40 },
    { label: t('bcpnpCalculator.language'),           pts: result.language,       max: 40 },
    { label: t('bcpnpCalculator.hourlyWage'),         pts: result.wage,           max: 55 },
    { label: t('bcpnpCalculator.areaOfEmployment'),   pts: result.region,         max: 25 },
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

  const renderSwitch = (
    key: keyof Pick<SirsInput, 'hasCanadianExp' | 'currentlyWorkingInJob' | 'hasTradesOrProfessionalCert' | 'bothOfficialLanguages' | 'hasRegionalExperience'>,
    label: string,
    hint: string,
    pts: number,
  ) => (
    <View style={s.switchRow}>
      <View style={s.switchText}>
        <Text style={[s.switchLabel, { color: c.textPrimary }]}>
          {label} <Text style={{ color: accent }}>+{pts}</Text>
        </Text>
        <Text style={[s.switchHint, { color: c.textMuted }]}>{hint}</Text>
      </View>
      <Switch
        value={input[key]}
        onValueChange={(v) => set(key, v)}
        trackColor={{ false: c.surfaceTertiary, true: accent }}
        thumbColor={palette.white}
        accessibilityLabel={label}
      />
    </View>
  );

  return (
    <View style={[s.wrap, { backgroundColor: c.surfacePrimary }]}>
      <AppHeader title={t('bcpnpCalculator.title')} variant="stack" />

      <ScrollView
        contentContainerStyle={[s.body, contentFrameStyle, { paddingBottom: insets.bottom + spacing['2xl'] }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Score hero */}
        <View style={[s.card, { borderColor: c.border, backgroundColor: c.surfaceCard }]}>
          <View style={s.scoreHero}>
            <Text style={[s.scoreNum, { color: accent }]}>{result.total}</Text>
            <Text style={[s.scoreOutOf, { color: c.textMuted }]}>/ {SIRS_MAX_SCORE} points</Text>
            <Text style={[s.heroNote, { color: c.textSecondary }]}>
              {t('bcpnpCalculator.noFixedPass')}
            </Text>
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

        {/* Work experience */}
        <View style={[s.card, { borderColor: c.border, backgroundColor: c.surfaceCard }]}>
          <Text style={[s.sectionTitle, { color: c.textPrimary }]}>{t('bcpnpCalculator.workExperience')}</Text>
          <Text style={[s.hint, { color: c.textSecondary }]}>
            {t('bcpnpCalculator.expInOccupation')}
          </Text>
          {renderOptions(
            WORK_OPTIONS.map((o) => ({
              ...o,
              label: o.value === 'none' ? t('bcpnpCalculator.none')
                : o.value === '1_2' ? t('bcpnpCalculator.oneTwoYrs')
                : o.value === '2_3' ? t('bcpnpCalculator.twoThreeYrs')
                : o.value === '3_4' ? t('bcpnpCalculator.threeFourYrs')
                : o.value === '4_5' ? t('bcpnpCalculator.fourFiveYrs')
                : o.value === '5plus' ? t('bcpnpCalculator.fivePlusYrs')
                : o.label,
            })),
            input.workYears,
            (v) => set('workYears', v),
          )}
          {renderSwitch('hasCanadianExp', t('bcpnpCalculator.canadianWorkExp'), t('bcpnpCalculator.oneYearInCanada'), 10)}
          {renderSwitch('currentlyWorkingInJob', t('bcpnpCalculator.currentlyWorking'), t('bcpnpCalculator.fullTimeBc'), 10)}
        </View>

        {/* Education */}
        <View style={[s.card, { borderColor: c.border, backgroundColor: c.surfaceCard }]}>
          <Text style={[s.sectionTitle, { color: c.textPrimary }]}>{t('bcpnpCalculator.education')}</Text>
          {renderOptions(EDUCATION_OPTIONS, input.education, (v) => set('education', v))}
          <Text style={[s.hint, { color: c.textSecondary, marginTop: spacing.xs }]}>
            {t('bcpnpCalculator.educationLocation')}
          </Text>
          {renderOptions(EDU_LOCATION_OPTIONS, input.educationLocation, (v) => set('educationLocation', v))}
          {renderSwitch('hasTradesOrProfessionalCert', t('bcpnpCalculator.professionalDesignation'), t('bcpnpCalculator.designationOrSeal'), 5)}
        </View>

        {/* Language */}
        <View style={[s.card, { borderColor: c.border, backgroundColor: c.surfaceCard }]}>
          <Text style={[s.sectionTitle, { color: c.textPrimary }]}>{t('bcpnpCalculator.language')}</Text>
          <Text style={[s.hint, { color: c.textSecondary }]}>
            {t('bcpnpCalculator.lowestClb')}
          </Text>
          {renderOptions(
            LANGUAGE_OPTIONS.map((o) => ({
              ...o,
              label: o.value === 'clb9plus' ? t('bcpnpCalculator.clb9Plus')
                : o.value === 'clb8' ? t('bcpnpCalculator.clb8')
                : o.value === 'clb7' ? t('bcpnpCalculator.clb7')
                : o.value === 'clb6' ? t('bcpnpCalculator.clb6')
                : o.value === 'clb5' ? t('bcpnpCalculator.clb5')
                : o.value === 'clb4' ? t('bcpnpCalculator.clb4')
                : o.label,
            })),
            input.language,
            (v) => set('language', v),
          )}
          {renderSwitch('bothOfficialLanguages', t('bcpnpCalculator.bothFrenchEnglish'), 'Capped at 40 total for language', 10)}
        </View>

        {/* Wage */}
        <View style={[s.card, { borderColor: c.border, backgroundColor: c.surfaceCard }]}>
          <Text style={[s.sectionTitle, { color: c.textPrimary }]}>{t('bcpnpCalculator.hourlyWage')}</Text>
          <View style={[s.wageRow, { borderColor: c.border, backgroundColor: c.surfaceSecondary }]}>
            <Text style={[s.wageCurrency, { color: c.textMuted }]}>$</Text>
            <TextInput
              style={[s.wageInput, { color: c.textPrimary }]}
              value={wageText}
              onChangeText={onWageChange}
              keyboardType="decimal-pad"
              placeholder={t('bcpnpCalculator.wagePlaceholder')}
              placeholderTextColor={c.textMuted}
              accessibilityLabel={t('bcpnpCalculator.wageCurrency')}
            />
            <Text style={[s.wageUnit, { color: c.textMuted }]}>{t('bcpnpCalculator.perHour')}</Text>
            <View style={[s.wagePts, { backgroundColor: accent + '18' }]}>
              <Text style={[s.wagePtsText, { color: accent }]}>{sirsWagePoints(input.hourlyWage)} pts</Text>
            </View>
          </View>
          <Text style={[s.hint, { color: c.textSecondary }]}>
            {t('bcpnpCalculator.wageHint')}
          </Text>
        </View>

        {/* Region */}
        <View style={[s.card, { borderColor: c.border, backgroundColor: c.surfaceCard }]}>
          <Text style={[s.sectionTitle, { color: c.textPrimary }]}>{t('bcpnpCalculator.areaOfEmployment')}</Text>
          {renderOptions(REGION_OPTIONS, input.region, (v) => set('region', v))}
          {renderSwitch('hasRegionalExperience', 'Worked or studied outside Metro Vancouver', '1+ year full-time work, or recent study, in regional B.C.', 10)}
        </View>

        <Text style={[s.disclaimer, { color: c.textMuted }]}>
          Estimate based on the WelcomeBC SIRS scoring criteria. Stream eligibility (job offer,
          occupation skill level, wage requirements) applies separately. Verify with the official
          BC PNP program guide on welcomebc.ca.
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
  heroNote:   { fontSize: typography.xs, lineHeight: 17, textAlign: 'center', paddingHorizontal: spacing.md },

  breakdown:    { marginTop: spacing.sm, gap: spacing.xs },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bLabel:       { fontSize: typography.sm, fontWeight: typography.medium },
  bValue:       { fontSize: typography.sm, fontWeight: typography.bold },

  option: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md, borderWidth: 1,
  },
  optionLabel: { flex: 1, fontSize: typography.sm, fontWeight: typography.semibold },
  optionPts:   { fontSize: typography.xs, fontWeight: typography.bold },

  switchRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                 gap: spacing.md, paddingVertical: spacing.xs + 2 },
  switchText:  { flex: 1, gap: 2 },
  switchLabel: { fontSize: typography.sm, fontWeight: typography.semibold },
  switchHint:  { fontSize: typography.xs, lineHeight: 16 },

  wageRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    borderWidth: 1, borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
  },
  wageCurrency: { fontSize: typography.lg, fontWeight: typography.bold },
  wageInput:    { flex: 1, fontSize: typography.xl, fontWeight: typography.black, paddingVertical: spacing.xs },
  wageUnit:     { fontSize: typography.sm, fontWeight: typography.medium },
  wagePts: {
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  wagePtsText: { fontSize: typography.sm, fontWeight: typography.bold },

  disclaimer: { fontSize: typography.xs, lineHeight: 18, textAlign: 'center',
                paddingHorizontal: spacing.sm, marginTop: spacing.xs },
});
