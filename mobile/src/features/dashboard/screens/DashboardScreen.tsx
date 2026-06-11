import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useProfileStore, type CalcInputs, DEFAULT_CALC_INPUTS } from '@/store/profileStore';
import { useDrawsStore } from '@/store/drawsStore';
import { palette, spacing, typography, borderRadius } from '@/theme';
import { useColors } from '@/hooks/useColors';
import { useAccentColor } from '@/hooks/useAccentColor';
import {
  calculateCRS, suggestCategory, toCLB, getClbBreakpoints, getClbBand,
  type CRSInput, type LanguageTest, type LangScores, type TefScale,
} from '@/features/onboarding/utils/crsCalculator';
import type { ProgramCategory } from '@/types';
import { isCrsScoreReady } from '@/utils/crsScoreReady';
import { useTabBarLayout } from '@/hooks/useTabBarLayout';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { SideMenu } from '../components/SideMenu';

const EDU_OPTIONS = [
  { label: 'Less than high school', value: 'less_than_secondary' },
  { label: 'High school',           value: 'secondary' },
  { label: '1-yr diploma',          value: '1year' },
  { label: '2-yr diploma',          value: '2year' },
  { label: "Bachelor's",            value: 'bachelors' },
  { label: '2+ certs (3yr+)',       value: 'two_or_more' },
  { label: "Master's",              value: 'masters' },
  { label: 'PhD',                   value: 'phd' },
];

// IRCC accepts either official language first — English (IELTS/CELPIP/PTE
// Core) or French (TEF Canada/TCF Canada). The second language must be the
// other official language, so the second-test options depend on the first.
const ENGLISH_TESTS = ['IELTS', 'CELPIP', 'PTE Core'] as const;
const FRENCH_TESTS = ['TEF', 'TCF'] as const;
const LANG_TESTS = [...ENGLISH_TESTS, ...FRENCH_TESTS] as const;
const LANG_TEST_MAP: Record<string, LanguageTest> = {
  IELTS: 'IELTS', CELPIP: 'CELPIP', 'PTE Core': 'PTE_CORE', TEF: 'TEF', TCF: 'TCF',
};

function isFrenchTest(test: string): boolean {
  return test === 'TEF' || test === 'TCF';
}

function fmtScore(test: LanguageTest, score: number): string {
  if (score <= 0) return '—';
  if (test === 'IELTS') return score.toFixed(1);
  return Math.round(score).toString();
}

function buildCRSInput(d: CalcInputs): CRSInput {
  const firstTest  = (LANG_TEST_MAP[d.firstLangTest]  ?? 'IELTS')  as LanguageTest;
  const secondTest = (LANG_TEST_MAP[d.secondLangTest] ?? 'TEF')    as LanguageTest;
  const clb = (v: number) => Math.min(12, Math.max(0, Math.round(v)));
  return {
    maritalStatus: d.maritalStatus,
    age: d.age,
    education: d.education as any,
    canadianEducation: d.canadianEducation,
    firstLangTest: firstTest,
    firstLang: { speaking: d.firstLangSpeaking, listening: d.firstLangListening,
                 reading:  d.firstLangReading,  writing:  d.firstLangWriting },
    hasSecondLang: d.hasSecondLang,
    secondLangTest: secondTest,
    secondLang: { speaking: d.secondLangSpeaking, listening: d.secondLangListening,
                  reading:  d.secondLangReading,  writing:  d.secondLangWriting },
    canadianWorkExp:    Math.min(5, d.canadianWorkExp) as any,
    foreignWorkExp:     d.foreignWorkExp as any,
    spouseEducation:    d.spouseEducation as any,
    // Spouse lang stored as CLB directly
    spouseLang: { speaking: clb(d.spouseLangSpeaking), listening: clb(d.spouseLangListening),
                  reading:  clb(d.spouseLangReading),  writing:  clb(d.spouseLangWriting) },
    spouseCanadianWorkExp: Math.min(5, d.spouseCanadianWorkExp) as any,
    hasProvincialNomination: d.hasProvincialNomination,
    jobOffer:           d.jobOffer as any,
    hasSiblingInCanada: d.hasSiblingInCanada,
    hasTradeCert:       d.hasTradeCert,
    tefScale:           (d.tefScale ?? 'current') as TefScale,
  };
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function OptionPill({ label, selected, onPress }: {
  label: string; selected: boolean; onPress: () => void;
}) {
  const c = useColors();
  const accent = useAccentColor();
  return (
    <TouchableOpacity
      style={[st.pill, { borderColor: c.border, backgroundColor: c.surfaceCard },
        selected && { borderColor: accent, backgroundColor: accent + '18' }]}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
    >
      <Text style={[st.pillText, { color: c.textSecondary },
        selected && { color: c.textPrimary, fontWeight: typography.semibold }]}>
        {label}
      </Text>
      {selected && <Ionicons name="checkmark-circle" size={14} color={accent} />}
    </TouchableOpacity>
  );
}

function SectionHeader({ title, icon, expanded, onToggle, summaryText, score }: {
  title: string; icon: string; expanded: boolean; onToggle: () => void;
  summaryText?: string; score?: number | null;
}) {
  const c = useColors();
  const accent = useAccentColor();
  return (
    <TouchableOpacity
      style={[st.secHeader, { borderColor: c.border, backgroundColor: c.surfaceCard }]}
      onPress={onToggle} activeOpacity={0.7}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={`${title} section, ${expanded ? 'expanded' : 'collapsed'}`}
      accessibilityState={{ expanded }}
    >
      <View style={[st.secIcon, { backgroundColor: accent + '18' }]}>
        <Ionicons name={icon as any} size={15} color={accent} />
      </View>
      <View style={st.secMid}>
        <Text style={[st.secTitle, { color: c.textPrimary }]}>{title}</Text>
        {!expanded && summaryText
          ? <Text style={[st.secSummary, { color: c.textMuted }]} numberOfLines={1}>{summaryText}</Text>
          : null}
      </View>
      {score != null && !expanded && (
        <View style={[st.secScoreBadge, { backgroundColor: palette.success + '20', borderColor: palette.success + '60' }]}>
          <Text style={[st.secScoreText, { color: palette.success }]}>{score}</Text>
        </View>
      )}
      <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={c.textMuted} />
    </TouchableOpacity>
  );
}

function FieldLabel({ children, top }: { children: string; top?: boolean }) {
  const c = useColors();
  return (
    <Text style={[st.fieldLabel, { color: c.textMuted }, top && { marginTop: spacing.lg }]}>
      {children}
    </Text>
  );
}

/** Snaps through IRCC CLB breakpoints for a given test + skill. */
function LangInput({ label, test, skill, value, onChange, tefScale = 'current' }: {
  label: string; test: LanguageTest; skill: keyof LangScores;
  value: number; onChange: (v: number) => void; tefScale?: TefScale;
}) {
  const c = useColors();
  const accent = useAccentColor();

  // Breakpoints: [0 = "not set", CLB4 minimum, CLB5 minimum, ..., CLB10+]
  // Filter to CLB ≥ 4 so the first + tap always lands on a valid EE score.
  const bps = useMemo(() => {
    const raw = getClbBreakpoints(test, skill, tefScale);
    const valid = raw.filter(s => toCLB(test, skill, s, tefScale) >= 4);
    return [0, ...valid];
  }, [test, skill, tefScale]);

  // Index of current value in bps (largest bp <= value)
  const idx = useMemo(() => {
    let i = 0;
    for (let j = 1; j < bps.length; j++) {
      if ((bps[j] ?? Infinity) <= value + 0.001) i = j; else break;
    }
    return value <= 0 ? 0 : i;
  }, [bps, value]);

  const clb   = toCLB(test, skill, value, tefScale);
  const isSet = value > 0 && clb >= 4;

  // Band range for current CLB level (e.g. 42–50 for PTE CLB 4)
  const scoreDisplay = useMemo(() => {
    if (!isSet) return '';
    const [lo, hi] = getClbBand(test, skill, value, tefScale);
    return lo < hi - 0.001
      ? `${fmtScore(test, lo)}–${fmtScore(test, hi)}`
      : fmtScore(test, value);
  }, [test, skill, value, isSet, tefScale]);

  return (
    <View style={[st.langRow, { backgroundColor: c.surfaceInput, borderColor: c.border }]}>
      <Text style={[st.langLbl, { color: c.textSecondary }]}>{label}</Text>
      <View style={st.langCtrl}>
        <TouchableOpacity
          style={[st.clbBtn, { backgroundColor: idx <= 0 ? c.surfaceTertiary : accent }]}
          onPress={() => { const p = bps[idx - 1]; if (p !== undefined) onChange(p); }}
          disabled={idx <= 0}
        >
          <Ionicons name="remove" size={15} color={idx <= 0 ? c.textMuted : palette.white} />
        </TouchableOpacity>
        <View style={[st.langVal, { backgroundColor: isSet ? accent + '15' : c.surfaceTertiary }]}>
          {isSet ? (
            <>
              <Text style={[st.langScore, { color: c.textPrimary }]}>{scoreDisplay}</Text>
              <Text style={[st.langClb, { color: accent }]}>CLB {clb}</Text>
            </>
          ) : (
            <Text style={[st.langNotSet, { color: c.textMuted }]}>Not set</Text>
          )}
        </View>
        <TouchableOpacity
          style={[st.clbBtn, { backgroundColor: idx >= bps.length - 1 ? c.surfaceTertiary : accent }]}
          onPress={() => { const n = bps[idx + 1]; if (n !== undefined) onChange(n); }}
          disabled={idx >= bps.length - 1}
        >
          <Ionicons name="add" size={15} color={idx >= bps.length - 1 ? c.textMuted : palette.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

/** Simple CLB-only stepper (1–12) for spouse / second language. */
function CLBStepper({ label, value, onChange }: {
  label: string; value: number; onChange: (v: number) => void;
}) {
  const c = useColors();
  const accent = useAccentColor();
  return (
    <View style={[st.langRow, { backgroundColor: c.surfaceInput, borderColor: c.border }]}>
      <Text style={[st.langLbl, { color: c.textSecondary }]}>{label}</Text>
      <View style={st.langCtrl}>
        <TouchableOpacity
          style={[st.clbBtn, { backgroundColor: value <= 0 ? c.surfaceTertiary : accent }]}
          onPress={() => onChange(Math.max(0, value - 1))} disabled={value <= 0}
        >
          <Ionicons name="remove" size={15} color={value <= 0 ? c.textMuted : palette.white} />
        </TouchableOpacity>
        <View style={[st.langVal, { backgroundColor: value > 0 ? accent + '15' : c.surfaceTertiary }]}>
          {value > 0
            ? <Text style={[st.langScore, { color: accent }]}>CLB {value}</Text>
            : <Text style={[st.langNotSet, { color: c.textMuted }]}>Not set</Text>}
        </View>
        <TouchableOpacity
          style={[st.clbBtn, { backgroundColor: value >= 12 ? c.surfaceTertiary : accent }]}
          onPress={() => onChange(Math.min(12, value + 1))} disabled={value >= 12}
        >
          <Ionicons name="add" size={15} color={value >= 12 ? c.textMuted : palette.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Stepper({ value, onChange, min = 0, max = 10, unit, label }: {
  value: number; onChange: (v: number) => void;
  min?: number; max?: number; unit?: string; label?: string;
}) {
  const c = useColors();
  const accent = useAccentColor();
  return (
    <View style={[st.stepper, { backgroundColor: c.surfaceInput, borderColor: c.border }]}>
      <TouchableOpacity
        style={[st.stepBtn, { backgroundColor: value <= min ? c.surfaceTertiary : accent }]}
        onPress={() => onChange(Math.max(min, value - 1))} disabled={value <= min}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={label ? `Decrease ${label}` : 'Decrease'}
      >
        <Ionicons name="remove" size={18} color={value <= min ? c.textMuted : palette.white} />
      </TouchableOpacity>
      <Text style={[st.stepVal, { color: c.textPrimary }]}>
        {value}{value === max ? '+' : ''}{unit ? ` ${unit}` : ''}
      </Text>
      <TouchableOpacity
        style={[st.stepBtn, { backgroundColor: value >= max ? c.surfaceTertiary : accent }]}
        onPress={() => onChange(Math.min(max, value + 1))} disabled={value >= max}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={label ? `Increase ${label}` : 'Increase'}
      >
        <Ionicons name="add" size={18} color={value >= max ? c.textMuted : palette.white} />
      </TouchableOpacity>
    </View>
  );
}

function Toggle({ label, value, onPress, icon }: {
  label: string; value: boolean; onPress: () => void; icon?: string;
}) {
  const c = useColors();
  const accent = useAccentColor();
  return (
    <TouchableOpacity style={[st.toggle, { borderColor: c.border }]} onPress={onPress}>
      <Ionicons
        name={(value ? (icon ?? 'checkmark-circle') : 'add-circle-outline') as any}
        size={17} color={accent}
      />
      <Text style={[st.toggleTxt, { color: c.textSecondary }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

type SectionName = 'personal' | 'education' | 'language' | 'work' | 'additional' | 'spouse';
type SectionMap  = Record<SectionName, boolean>;

const CLOSED_SECTIONS: SectionMap = {
  personal: false, education: false, language: false,
  work: false, additional: false, spouse: false,
};

function coerceInputs(saved: CalcInputs): CalcInputs {
  const n = (v: any) => Number(v) || 0;
  return {
    ...DEFAULT_CALC_INPUTS,
    ...saved,
    tefScale: saved.tefScale ?? 'current',
    firstLangSpeaking:  n(saved.firstLangSpeaking),  firstLangListening: n(saved.firstLangListening),
    firstLangReading:   n(saved.firstLangReading),   firstLangWriting:   n(saved.firstLangWriting),
    secondLangSpeaking: n(saved.secondLangSpeaking), secondLangListening:n(saved.secondLangListening),
    secondLangReading:  n(saved.secondLangReading),  secondLangWriting:  n(saved.secondLangWriting),
    spouseLangSpeaking: n(saved.spouseLangSpeaking), spouseLangListening:n(saved.spouseLangListening),
    spouseLangReading:  n(saved.spouseLangReading),  spouseLangWriting:  n(saved.spouseLangWriting),
  };
}

export default function DashboardScreen() {
  const c      = useColors();
  const accent = useAccentColor();
  const { floatingBottomOffset, floatingOverlayPaddingBottom } = useTabBarLayout();
  const { contentFrameStyle } = useResponsiveLayout();
  const profile        = useProfileStore((s) => s.profile);
  const resetKey       = useProfileStore((s) => s.resetKey);
  const saveCalcInputs = useProfileStore((s) => s.saveCalcInputs);
  const saveProfile    = useProfileStore((s) => s.save);
  const { draws } = useDrawsStore();

  const [inputs, setInputs] = useState<CalcInputs>(() =>
    coerceInputs(profile?.calculatorInputs ?? DEFAULT_CALC_INPUTS)
  );
  const [exp,      setExp]      = useState<SectionMap>({ ...CLOSED_SECTIONS });
  // reviewed: tracks which sections the user has explicitly opened this session
  const [, setReviewed] = useState<SectionMap>({ ...CLOSED_SECTIONS });
  const [menuOpen, setMenuOpen] = useState(false);

  // Re-sync all local state when store is hard-reset
  useEffect(() => {
    if (resetKey === 0) return;            // skip on first mount
    setInputs(coerceInputs(DEFAULT_CALC_INPUTS));
    setExp({ ...CLOSED_SECTIONS });
    setReviewed({ ...CLOSED_SECTIONS });
  }, [resetKey]);

  function upd<K extends keyof CalcInputs>(key: K, val: CalcInputs[K]) {
    setInputs((d) => ({ ...d, [key]: val }));
  }
  function tog(name: SectionName) {
    setExp((e) => ({ ...e, [name]: !e[name] }));
    // Mark as reviewed the first time the user opens it
    setReviewed((r) => r[name] ? r : { ...r, [name]: true });
  }

  const crsInput = useMemo(() => buildCRSInput(inputs), [inputs]);
  const result   = useMemo(() => calculateCRS(crsInput), [crsInput]);
  const cat = useMemo((): ProgramCategory =>
    suggestCategory(crsInput, result.firstLangClb) as ProgramCategory,
  [crsInput, result]);

  // Score shown only when all 4 first-language CLB fields are ≥ CLB 4
  const scoreReady = useMemo(
    () => isCrsScoreReady(
      inputs.firstLangTest,
      {
        speaking: inputs.firstLangSpeaking,
        listening: inputs.firstLangListening,
        reading: inputs.firstLangReading,
        writing: inputs.firstLangWriting,
      },
      (inputs.tefScale ?? 'current') as TefScale,
    ),
    [inputs.firstLangTest, inputs.tefScale, inputs.firstLangSpeaking, inputs.firstLangListening,
      inputs.firstLangReading, inputs.firstLangWriting],
  );

  // Autosave (debounced 800 ms)
  useEffect(() => {
    const t = setTimeout(() => {
      saveCalcInputs(inputs);
      if (scoreReady) {
        saveProfile({ crs_score: result.total, category: cat });
      } else {
        // Clear stale score when language inputs drop below CLB 4
        saveProfile({ crs_score: 0 });
      }
    }, 800);
    return () => clearTimeout(t);
  }, [inputs, result.total, cat, scoreReady, saveCalcInputs, saveProfile]);

  // Latest draw for cutoff comparison in floating pill
  // Map program category (from suggestCategory) to IRCC draw category:
  // FSW draws are stored as 'General'; FST draws are stored as 'Trades'
  const latestDraw = useMemo(() => {
    if (!draws.length) return null;
    const drawCat = cat === 'FSW' ? 'General' : cat === 'FST' ? 'Trades' : cat;
    return draws.find((d) => d.category === drawCat) ?? draws[0] ?? null;
  }, [draws, cat]);

  const score    = result.total;
  const scoreClr = score >= 500 ? palette.success : score >= 450 ? palette.warning : palette.danger;
  const married  = inputs.maritalStatus === 'married';

  // Bonus point attribution (so badges add up to total)
  const canadianEduBonus = inputs.canadianEducation === '3year_plus' ? 30
    : inputs.canadianEducation === '1_2year' ? 15 : 0;
  const frenchBonus = scoreReady
    ? Math.max(0, result.additionalPoints
        - (inputs.hasProvincialNomination ? 600 : 0)
        - (inputs.hasSiblingInCanada ? 15 : 0)
        - canadianEduBonus)
    : 0;

  // Section summaries (shown when collapsed)
  const persSummary = `Age ${inputs.age} · ${
    inputs.maritalStatus === 'single' ? 'Single'
    : inputs.maritalStatus === 'married_not_accompanying' ? 'Married (not accompanying)'
    : 'Married'}`;
  const eduSummary  = EDU_OPTIONS.find(e => e.value === inputs.education)?.label ?? inputs.education;
  const langSummary = useMemo(() => {
    if (!scoreReady) return `${inputs.firstLangTest} · not set`;
    const clbs = Object.values(result.firstLangClb);
    return `${inputs.firstLangTest} · CLB ${Math.min(...clbs)}–${Math.max(...clbs)}`;
  }, [scoreReady, inputs.firstLangTest, result.firstLangClb]);
  const workSummary = `${inputs.canadianWorkExp === 0 ? 'No CA exp' : `${inputs.canadianWorkExp}yr CA`} · ${
    inputs.foreignWorkExp === 0 ? 'No foreign exp' : inputs.foreignWorkExp === 1 ? '1–2yr foreign' : '3+yr foreign'}`;

  // ─── Section renderers ──────────────────────────────────────────────────────

  function renderPersonal() {
    return (
      <View style={st.secBody}>
        <FieldLabel>MARITAL / PARTNER STATUS</FieldLabel>
        <View style={st.pillRow}>
          <OptionPill label="Single"
            selected={inputs.maritalStatus === 'single'}
            onPress={() => upd('maritalStatus', 'single')} />
          <OptionPill label="Married (partner coming)"
            selected={inputs.maritalStatus === 'married'}
            onPress={() => upd('maritalStatus', 'married')} />
          <OptionPill label="Married (partner staying)"
            selected={inputs.maritalStatus === 'married_not_accompanying'}
            onPress={() => upd('maritalStatus', 'married_not_accompanying')} />
        </View>
        <FieldLabel top>YOUR AGE</FieldLabel>
        <Stepper value={inputs.age} onChange={v => upd('age', v)} min={17} max={55} unit="yrs" label="age" />
      </View>
    );
  }

  function renderEducation() {
    return (
      <View style={st.secBody}>
        <FieldLabel>HIGHEST EDUCATION</FieldLabel>
        <View style={st.pillGrid}>
          {EDU_OPTIONS.map(o => (
            <OptionPill key={o.value} label={o.label}
              selected={inputs.education === o.value}
              onPress={() => upd('education', o.value)} />
          ))}
        </View>
        <FieldLabel top>CANADIAN EDUCATION</FieldLabel>
        <View style={st.pillRow}>
          <OptionPill label="None"     selected={inputs.canadianEducation === 'none'}       onPress={() => upd('canadianEducation', 'none')} />
          <OptionPill label="1–2 yrs"  selected={inputs.canadianEducation === '1_2year'}    onPress={() => upd('canadianEducation', '1_2year')} />
          <OptionPill label="3+ yrs"   selected={inputs.canadianEducation === '3year_plus'} onPress={() => upd('canadianEducation', '3year_plus')} />
        </View>
      </View>
    );
  }

  function selectFirstLangTest(t: string) {
    setInputs(d => {
      const next = {
        ...d, firstLangTest: t,
        firstLangSpeaking: 0, firstLangListening: 0,
        firstLangReading: 0, firstLangWriting: 0,
      };
      // Second language must be the OTHER official language — swap its test
      // (and clear its scores) if it now collides with the first.
      if (isFrenchTest(t) === isFrenchTest(d.secondLangTest)) {
        next.secondLangTest = isFrenchTest(t) ? 'IELTS' : 'TEF';
        next.secondLangSpeaking = 0; next.secondLangListening = 0;
        next.secondLangReading = 0; next.secondLangWriting = 0;
      }
      return next;
    });
  }

  function renderLanguage() {
    const firstTest = (LANG_TEST_MAP[inputs.firstLangTest] ?? 'IELTS') as LanguageTest;
    const secondTest = (LANG_TEST_MAP[inputs.secondLangTest] ?? 'TEF') as LanguageTest;
    const tefScale = (inputs.tefScale ?? 'current') as TefScale;
    const usesTef = inputs.firstLangTest === 'TEF'
      || (inputs.hasSecondLang && inputs.secondLangTest === 'TEF');
    const secondLangOptions = isFrenchTest(inputs.firstLangTest) ? ENGLISH_TESTS : FRENCH_TESTS;
    return (
      <View style={st.secBody}>
        <FieldLabel>FIRST LANGUAGE TEST</FieldLabel>
        <View style={st.pillRow}>
          {LANG_TESTS.map(t => (
            <OptionPill key={t} label={t}
              selected={inputs.firstLangTest === t}
              onPress={() => selectFirstLangTest(t)} />
          ))}
        </View>
        {usesTef && (
          <>
            <FieldLabel top>TEF TEST DATE</FieldLabel>
            <View style={st.pillRow}>
              <OptionPill label="After Dec 2023"
                selected={tefScale === 'current'}
                onPress={() => upd('tefScale', 'current')} />
              <OptionPill label="Oct 2019–Dec 2023"
                selected={tefScale === 'oct2019'}
                onPress={() => upd('tefScale', 'oct2019')} />
              <OptionPill label="Before Oct 2019"
                selected={tefScale === 'legacy'}
                onPress={() => upd('tefScale', 'legacy')} />
            </View>
          </>
        )}
        <FieldLabel top>SCORES</FieldLabel>
        <LangInput label="Speaking"  test={firstTest} skill="speaking"  value={inputs.firstLangSpeaking}  onChange={v => upd('firstLangSpeaking',  v)} tefScale={tefScale} />
        <LangInput label="Listening" test={firstTest} skill="listening" value={inputs.firstLangListening} onChange={v => upd('firstLangListening', v)} tefScale={tefScale} />
        <LangInput label="Reading"   test={firstTest} skill="reading"   value={inputs.firstLangReading}   onChange={v => upd('firstLangReading',   v)} tefScale={tefScale} />
        <LangInput label="Writing"   test={firstTest} skill="writing"   value={inputs.firstLangWriting}   onChange={v => upd('firstLangWriting',   v)} tefScale={tefScale} />

        <Toggle
          label={inputs.hasSecondLang ? 'Second language scores added' : 'Add second official language (optional)'}
          value={inputs.hasSecondLang}
          onPress={() => upd('hasSecondLang', !inputs.hasSecondLang)}
        />
        {inputs.hasSecondLang && (
          <>
            <FieldLabel top>SECOND LANGUAGE TEST</FieldLabel>
            <View style={st.pillRow}>
              {secondLangOptions.map(t => (
                <OptionPill key={t} label={t}
                  selected={inputs.secondLangTest === t}
                  onPress={() => setInputs(d => ({
                    ...d, secondLangTest: t,
                    secondLangSpeaking: 0, secondLangListening: 0,
                    secondLangReading: 0, secondLangWriting: 0,
                  }))} />
              ))}
            </View>
            <FieldLabel top>SCORES</FieldLabel>
            <LangInput label="Speaking"  test={secondTest} skill="speaking"  value={inputs.secondLangSpeaking}  onChange={v => upd('secondLangSpeaking',  v)} tefScale={tefScale} />
            <LangInput label="Listening" test={secondTest} skill="listening" value={inputs.secondLangListening} onChange={v => upd('secondLangListening', v)} tefScale={tefScale} />
            <LangInput label="Reading"   test={secondTest} skill="reading"   value={inputs.secondLangReading}   onChange={v => upd('secondLangReading',   v)} tefScale={tefScale} />
            <LangInput label="Writing"   test={secondTest} skill="writing"   value={inputs.secondLangWriting}   onChange={v => upd('secondLangWriting',   v)} tefScale={tefScale} />
          </>
        )}
      </View>
    );
  }

  function renderWork() {
    return (
      <View style={st.secBody}>
        <FieldLabel>CANADIAN WORK EXPERIENCE</FieldLabel>
        <Stepper value={inputs.canadianWorkExp} onChange={v => upd('canadianWorkExp', v)}
          min={0} max={5} unit={inputs.canadianWorkExp === 1 ? 'year' : 'years'} />
        <FieldLabel top>FOREIGN WORK EXPERIENCE</FieldLabel>
        <View style={st.pillRow}>
          <OptionPill label="None"      selected={inputs.foreignWorkExp === 0} onPress={() => upd('foreignWorkExp', 0)} />
          <OptionPill label="1–2 years" selected={inputs.foreignWorkExp === 1} onPress={() => upd('foreignWorkExp', 1)} />
          <OptionPill label="3+ years"  selected={inputs.foreignWorkExp === 3} onPress={() => upd('foreignWorkExp', 3)} />
        </View>
        <Toggle label={inputs.hasTradeCert ? 'Certificate of qualification (trade)' : 'Add trade certificate (optional)'}
          value={inputs.hasTradeCert} onPress={() => upd('hasTradeCert', !inputs.hasTradeCert)} icon="ribbon" />
      </View>
    );
  }

  function renderAdditional() {
    return (
      <View style={st.secBody}>
        {/* Job offer notice — IRCC removed points as of Mar 25 2025 */}
        <View style={[st.noticeRow, { backgroundColor: palette.warningLight, borderColor: palette.warning + '40' }]}>
          <Ionicons name="information-circle" size={15} color={palette.warning} style={{ marginTop: 1 }} />
          <Text style={[st.noticeTxt, { color: palette.warning }]}>
            <Text style={{ fontWeight: typography.bold }}>Job offer points removed</Text>
            {' '}— As of March 25, 2025, IRCC no longer awards CRS points for job offers (previously 50–200 pts). Job offers still affect program eligibility.
          </Text>
        </View>
        <FieldLabel>PROVINCIAL NOMINATION</FieldLabel>
        <View style={st.pillRow}>
          <OptionPill label="No nomination"    selected={!inputs.hasProvincialNomination} onPress={() => upd('hasProvincialNomination', false)} />
          <OptionPill label="Yes — I have one" selected={inputs.hasProvincialNomination}  onPress={() => upd('hasProvincialNomination', true)} />
        </View>
        {inputs.hasProvincialNomination && (
          <View style={[st.bonusRow, { backgroundColor: palette.successLight, borderColor: palette.success + '30' }]}>
            <Ionicons name="trending-up" size={14} color={palette.success} />
            <Text style={[st.bonusTxt, { color: palette.success }]}>+600 pts — near-guaranteed invitation</Text>
          </View>
        )}
        <Toggle label={inputs.hasSiblingInCanada ? 'Sibling in Canada (citizen/PR)' : 'Add: sibling in Canada (optional)'}
          value={inputs.hasSiblingInCanada} onPress={() => upd('hasSiblingInCanada', !inputs.hasSiblingInCanada)} icon="people" />
      </View>
    );
  }

  function renderSpouse() {
    return (
      <View style={st.secBody}>
        <FieldLabel>PARTNER'S EDUCATION</FieldLabel>
        <View style={st.pillGrid}>
          {EDU_OPTIONS.map(o => (
            <OptionPill key={o.value} label={o.label}
              selected={inputs.spouseEducation === o.value}
              onPress={() => upd('spouseEducation', o.value)} />
          ))}
        </View>
        <FieldLabel top>PARTNER'S LANGUAGE (CLB)</FieldLabel>
        <CLBStepper label="Speaking"  value={inputs.spouseLangSpeaking}  onChange={v => upd('spouseLangSpeaking',  v)} />
        <CLBStepper label="Listening" value={inputs.spouseLangListening} onChange={v => upd('spouseLangListening', v)} />
        <CLBStepper label="Reading"   value={inputs.spouseLangReading}   onChange={v => upd('spouseLangReading',   v)} />
        <CLBStepper label="Writing"   value={inputs.spouseLangWriting}   onChange={v => upd('spouseLangWriting',   v)} />
        <FieldLabel top>PARTNER'S CANADIAN WORK EXP.</FieldLabel>
        <Stepper value={inputs.spouseCanadianWorkExp} onChange={v => upd('spouseCanadianWorkExp', v)}
          min={0} max={5} unit="years" />
      </View>
    );
  }

  // ─── Main render ─────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={[st.safe, { backgroundColor: c.surfacePrimary }]} edges={['top', 'left', 'right']}>
      <ScrollView
        style={st.scroll}
        contentContainerStyle={[
          st.content,
          { paddingBottom: floatingOverlayPaddingBottom },
          contentFrameStyle,
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={[st.appHeader, { borderBottomColor: c.border }]}>
          <TouchableOpacity onPress={() => setMenuOpen(true)} hitSlop={12} style={st.hamburger}>
            <Ionicons name="menu" size={26} color={c.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[st.appGreeting, { color: c.textMuted }]}>Express Entry</Text>
            <Text style={[st.appTitle, { color: c.textPrimary }]}>CRS Pulse</Text>
          </View>
          {scoreReady && (
            <View style={[st.catBadge, { backgroundColor: accent + '18', borderColor: accent + '30' }]}>
              <Text style={[st.catTxt, { color: accent }]}>{cat}</Text>
            </View>
          )}
        </View>

        <SideMenu visible={menuOpen} onClose={() => setMenuOpen(false)} />

        {/* Calculator */}
        <View style={st.calcSection}>
          <Text style={[st.calcTitle, { color: c.textPrimary }]}>CRS Calculator</Text>
          <Text style={[st.calcSub, { color: c.textMuted }]}>
            {scoreReady ? 'Score updates live as you edit' : 'Enter CLB 4+ scores in all four language skills to unlock your CRS'}
          </Text>
          <Text style={[st.disclaimer, { color: c.textMuted }]}>
            Unofficial calculator based on the IRCC CRS grid (2025-08-21). Verify with the official IRCC CRS tool.
          </Text>

          <SectionHeader title="Personal"        icon="person-outline"    expanded={exp.personal}
            onToggle={() => tog('personal')}   summaryText={persSummary} score={scoreReady ? result.agePoints : null} />
          {exp.personal && renderPersonal()}

          <SectionHeader title="Education"       icon="school-outline"    expanded={exp.education}
            onToggle={() => tog('education')}  summaryText={eduSummary}  score={scoreReady ? result.educationPoints + result.eduTransferPoints + canadianEduBonus : null} />
          {exp.education && renderEducation()}

          <SectionHeader title="Language"        icon="language-outline"  expanded={exp.language}
            onToggle={() => tog('language')}   summaryText={langSummary} score={scoreReady ? result.firstLangPoints + result.secondLangPoints + frenchBonus : null} />
          {exp.language && renderLanguage()}

          <SectionHeader title="Work Experience" icon="briefcase-outline" expanded={exp.work}
            onToggle={() => tog('work')}       summaryText={workSummary} score={scoreReady ? result.canadianWorkExpPoints + result.workTransferPoints : null} />
          {exp.work && renderWork()}

          <SectionHeader title="Additional"      icon="star-outline"      expanded={exp.additional}
            onToggle={() => tog('additional')}                            score={scoreReady ? (inputs.hasProvincialNomination ? 600 : 0) + (inputs.hasSiblingInCanada ? 15 : 0) || null : null} />
          {exp.additional && renderAdditional()}

          {married && (
            <>
              <SectionHeader title="Spouse / Partner" icon="people-outline" expanded={exp.spouse}
                onToggle={() => tog('spouse')} score={scoreReady ? result.spouseTotal || null : null} />
              {exp.spouse && renderSpouse()}
            </>
          )}
        </View>
      </ScrollView>

      {/* ── Floating score pill ── */}
      <View style={[st.floatWrap, { bottom: floatingBottomOffset }]} pointerEvents="none">
        {scoreReady ? (
          <View style={[st.floatCard, { backgroundColor: c.surfaceCard, borderColor: c.border,
            shadowColor: scoreClr }]}>
            <View style={[st.floatStripe, { backgroundColor: scoreClr }]} />
            <View style={st.floatInner}>
              <View style={st.floatStat}>
                <Text style={[st.floatLbl, { color: c.textMuted }]}>CRS SCORE</Text>
                <Text style={[st.floatScore, { color: scoreClr }]}>{score}</Text>
              </View>
              <View style={[st.floatRule, { backgroundColor: c.border }]} />
              <View style={st.floatStat}>
                <Text style={[st.floatLbl, { color: c.textMuted }]}>CATEGORY</Text>
                <Text style={[st.floatCat, { color: accent }]} numberOfLines={1}>{cat}</Text>
              </View>
              {latestDraw ? (
                <>
                  <View style={[st.floatRule, { backgroundColor: c.border }]} />
                  <View style={st.floatStat}>
                    <Text style={[st.floatLbl, { color: c.textMuted }]}>VS CUTOFF</Text>
                    <Text style={[st.floatDiff, {
                      color: score >= latestDraw.cutoff_score ? palette.success : palette.danger }]}>
                      {score >= latestDraw.cutoff_score ? '+' : ''}{score - latestDraw.cutoff_score}
                    </Text>
                  </View>
                </>
              ) : null}
            </View>
          </View>
        ) : (
          <View style={[st.floatHint, { backgroundColor: c.surfaceCard, borderColor: c.border }]}>
            <Ionicons name="calculator-outline" size={15} color={c.textMuted} />
            <Text style={[st.floatHintTxt, { color: c.textMuted }]}>
              Open <Text style={{ color: accent }}>Language</Text> and set all 4 CLB scores to see your CRS
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  safe:    { flex: 1 },
  scroll:  { flex: 1 },
  content: { paddingHorizontal: spacing.base },

  // Header
  hamburger:   { marginRight: spacing.sm, paddingBottom: 2 },
  appHeader:   { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
                 paddingTop: spacing.base, paddingBottom: spacing.md,
                 borderBottomWidth: 1, marginBottom: spacing.lg },
  appGreeting: { fontSize: typography.xs, fontWeight: typography.semibold,
                 letterSpacing: 0.8, textTransform: 'uppercase' },
  appTitle:    { fontSize: typography['3xl'], fontWeight: typography.black, letterSpacing: -0.5 },
  catBadge:    { borderRadius: borderRadius.full, paddingHorizontal: spacing.md,
                 paddingVertical: spacing.xs, borderWidth: 1 },
  catTxt:      { fontSize: typography.sm, fontWeight: typography.semibold },

  // Calculator
  calcSection: { marginBottom: spacing.lg },
  calcTitle:   { fontSize: typography.xl, fontWeight: typography.bold, marginBottom: 2 },
  calcSub:     { fontSize: typography.xs, marginBottom: spacing.xs },
  disclaimer:  { fontSize: typography.xs, lineHeight: 16, marginBottom: spacing.lg, fontStyle: 'italic' },

  // Section header
  secHeader: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg,
               borderRadius: borderRadius.md, borderWidth: 0.3, marginBottom: 8, gap: spacing.md },
  secIcon:   { width: 38, height: 38, borderRadius: borderRadius.md,
               alignItems: 'center', justifyContent: 'center' },
  secMid:    { flex: 1 },
  secTitle:  { fontSize: typography.lg, fontWeight: typography.semibold },
  secSummary:{ fontSize: typography.xs, marginTop: 1 },
  secScoreBadge: { borderRadius: borderRadius.md, borderWidth: 0.5, paddingHorizontal: 7, paddingVertical: 2, marginRight: 4 },
  secScoreText:  { fontSize: typography.xs, fontWeight: typography.bold },
  secBody:   { paddingHorizontal: spacing.xs, paddingBottom: spacing.sm, marginBottom: spacing.sm },

  // Field label
  fieldLabel: { fontSize: typography.xs, fontWeight: typography.semibold, letterSpacing: 0.8,
                textTransform: 'uppercase', marginBottom: spacing.sm },

  // Pills
  pillRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.xs },
  pillGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.xs },
  pill:     { flexDirection: 'row', alignItems: 'center', borderRadius: borderRadius.md,
              borderWidth: 0.3, paddingHorizontal: spacing.sm, paddingVertical: 7, gap: 5 },
  pillText: { fontSize: typography.sm, flexShrink: 1 },

  // Language input row
  langRow:    { borderRadius: borderRadius.md, borderWidth: 0.3,
                paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
                marginBottom: spacing.xs },
  langLbl:    { fontSize: typography.sm, marginBottom: spacing.sm },
  langCtrl:   { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  clbBtn:     { width: 34, height: 34, borderRadius: borderRadius.md,
                alignItems: 'center', justifyContent: 'center' },
  langVal:    { flex: 1, borderRadius: borderRadius.md, alignItems: 'center',
                paddingVertical: 6, gap: 1 },
  langScore:  { fontSize: typography.base, fontWeight: typography.bold },
  langClb:    { fontSize: typography.xs, fontWeight: typography.semibold },
  langNotSet: { fontSize: typography.sm },

  // Stepper
  stepper: { flexDirection: 'row', alignItems: 'center', borderRadius: borderRadius.md,
             borderWidth: 0.3, padding: spacing.sm, gap: spacing.md, marginBottom: spacing.xs },
  stepBtn: { width: 36, height: 36, borderRadius: borderRadius.md,
             alignItems: 'center', justifyContent: 'center' },
  stepVal: { flex: 1, textAlign: 'center', fontSize: typography.lg, fontWeight: typography.bold },

  // Toggle
  toggle:    { flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
               borderRadius: borderRadius.md, borderWidth: 0.3,
               padding: spacing.md, marginBottom: spacing.xs },
  toggleTxt: { flex: 1, fontSize: typography.sm },

  // Hint / bonus
  hint:     { flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
              borderRadius: borderRadius.md, borderWidth: 0.3,
              padding: spacing.sm, marginBottom: spacing.sm },
  hintTxt:  { flex: 1, fontSize: typography.xs },
  bonusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
              borderRadius: borderRadius.md, borderWidth: 0.3,
              padding: spacing.sm, marginTop: spacing.xs, marginBottom: spacing.xs },
  bonusTxt: { fontSize: typography.sm, fontWeight: typography.semibold },
  noticeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs,
               borderRadius: borderRadius.md, borderWidth: 0.3,
               padding: spacing.sm, marginBottom: spacing.md },
  noticeTxt: { flex: 1, fontSize: typography.xs, lineHeight: 18 },

  // Floating score
  floatWrap: { position: 'absolute', left: spacing.base, right: spacing.base },

  floatCard:  { borderRadius: borderRadius.xl, borderWidth: 1, overflow: 'hidden',
                shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12,
                elevation: 8 },
  floatStripe:{ height: 3 },
  floatInner: { flexDirection: 'row', alignItems: 'stretch',
                paddingHorizontal: spacing.base, paddingVertical: spacing.md, gap: 0 },
  floatStat:  { flex: 1, alignItems: 'center', gap: 2 },
  floatLbl:   { fontSize: 9, fontWeight: typography.semibold,
                letterSpacing: 0.8, textTransform: 'uppercase' },
  floatScore: { fontSize: typography['3xl'], fontWeight: typography.black, letterSpacing: -1 },
  floatCat:   { fontSize: typography.base, fontWeight: typography.bold },
  floatDiff:  { fontSize: typography.xl, fontWeight: typography.black },
  floatRule:  { width: 1, marginVertical: 4, alignSelf: 'stretch' },

  floatHint:    { flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
                  borderRadius: borderRadius.xl, borderWidth: 1,
                  paddingHorizontal: spacing.base, paddingVertical: spacing.md },
  floatHintTxt: { flex: 1, fontSize: typography.sm },
});
