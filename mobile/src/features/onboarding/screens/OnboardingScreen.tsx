import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useOnboardingStore } from '@/store/onboardingStore';
import { useProfileStore } from '@/store/profileStore';
import type { Category } from '@/types';
import { palette, spacing, typography, borderRadius } from '@/theme';
import { useColors } from '@/hooks/useColors';
import { useAccentColor } from '@/hooks/useAccentColor';
import type { Colors } from '@/theme/colors';
import {
  calculateCRS,
  scoresToCLB,
  suggestCategory,
  getClbBreakpoints,
  getClbBand,
  type CRSInput,
  type EducationLevel,
  type JobOfferType,
  type LangScores,
  type LanguageTest,
  type MaritalStatus,
} from '../utils/crsCalculator';

// ─── Types ─────────────────────────────────────────────────────────────────────

type WizardData = {
  maritalStatus: MaritalStatus;
  age: string;
  education: EducationLevel;
  canadianEducation: 'none' | '1_2year' | '3year_plus';
  firstLangTest: LanguageTest;
  firstLangSpeaking: string;
  firstLangListening: string;
  firstLangReading: string;
  firstLangWriting: string;
  hasSecondLang: boolean;
  secondLangTest: LanguageTest;
  secondLangSpeaking: string;
  secondLangListening: string;
  secondLangReading: string;
  secondLangWriting: string;
  canadianWorkExp: number;
  foreignWorkExp: number;
  spouseEducation: EducationLevel;
  spouseLangSpeaking: string;
  spouseLangListening: string;
  spouseLangReading: string;
  spouseLangWriting: string;
  spouseCanadianWorkExp: number;
  hasProvincialNomination: boolean;
  jobOffer: JobOfferType;
  hasSiblingInCanada: boolean;
  hasTradeCert: boolean;
};

const DEFAULT_DATA: WizardData = {
  maritalStatus: 'single',
  age: '30',
  education: 'bachelors',
  canadianEducation: 'none',
  firstLangTest: 'IELTS',
  firstLangSpeaking: '7.0',
  firstLangListening: '8.0',
  firstLangReading: '7.0',
  firstLangWriting: '7.0',
  hasSecondLang: false,
  secondLangTest: 'CLB',
  secondLangSpeaking: '0',
  secondLangListening: '0',
  secondLangReading: '0',
  secondLangWriting: '0',
  canadianWorkExp: 0,
  foreignWorkExp: 0,
  spouseEducation: 'secondary',
  spouseLangSpeaking: '0',
  spouseLangListening: '0',
  spouseLangReading: '0',
  spouseLangWriting: '0',
  spouseCanadianWorkExp: 0,
  hasProvincialNomination: false,
  jobOffer: 'none',
  hasSiblingInCanada: false,
  hasTradeCert: false,
};

// ─── Sub-components ─────────────────────────────────────────────────────────────

function OptionPill({ label, selected, onPress, icon }: {
  label: string; selected: boolean; onPress: () => void; icon?: string;
}) {
  const c = useColors();
  const accent = useAccentColor();
  return (
    <TouchableOpacity
      style={[
        styles.pill,
        { borderColor: c.border, backgroundColor: c.surfaceCard },
        selected && { borderColor: accent, backgroundColor: accent + '18' },
      ]}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
    >
      <View style={styles.pillInner}>
        {icon && (
          <Ionicons
            name={icon as React.ComponentProps<typeof Ionicons>['name']}
            size={16}
            color={selected ? accent : c.textSecondary}
            style={styles.pillIcon}
          />
        )}
        <Text style={[
          styles.pillText,
          { color: c.textSecondary },
          selected && { color: c.textPrimary, fontWeight: typography.semibold },
        ]}>
          {label}
        </Text>
      </View>
      {selected && (
        <Ionicons name="checkmark-circle" size={20} color={accent} />
      )}
    </TouchableOpacity>
  );
}

function SectionLabel({ children, style }: { children: string; style?: object }) {
  const c = useColors();
  return (
    <Text style={[styles.sectionLabel, { color: c.textMuted }, style]}>
      {children}
    </Text>
  );
}

function NumberStepper({ value, onChange, min = 0, max = 10, label, unit }: {
  value: number; onChange: (v: number) => void; min?: number; max?: number; label?: string; unit?: string;
}) {
  const c = useColors();
  const accent = useAccentColor();
  return (
    <View style={[styles.stepperCard, { backgroundColor: c.surfaceCard, borderColor: c.border }]}>
      {label && <Text style={[styles.stepperLabel, { color: c.textSecondary }]}>{label}</Text>}
      <View style={styles.stepper}>
        <TouchableOpacity
          style={[styles.stepBtn, { backgroundColor: value <= min ? c.surfaceTertiary : accent }]}
          onPress={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
        >
          <Ionicons name="remove" size={20} color={value <= min ? c.textMuted : palette.white} />
        </TouchableOpacity>
        <Text style={[styles.stepValue, { color: c.textPrimary }]}>
          {value === max ? `${value}+` : value}{unit ? ` ${unit}` : ''}
        </Text>
        <TouchableOpacity
          style={[styles.stepBtn, { backgroundColor: value >= max ? c.surfaceTertiary : accent }]}
          onPress={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
        >
          <Ionicons name="add" size={20} color={value >= max ? c.textMuted : palette.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Slider ─────────────────────────────────────────────────────────────────────

const THUMB_SIZE = 28;
const THUMB_HALF = THUMB_SIZE / 2;
const DOT_SIZE   = 6;

function JSSlider({ value, min, max, step, onChange, ticks = [], accentColor }: {
  value: number; min: number; max: number; step: number; onChange: (v: number) => void; ticks?: number[]; accentColor: string;
}) {
  const c = useColors();
  const trackWidthSV  = useSharedValue(0);
  const posSV         = useSharedValue(value);
  const startPosSV    = useSharedValue(value);
  const lastEmitted   = useSharedValue<number>(-Infinity);
  const gestureActive = useSharedValue(false);

  const prevValRef = useRef(value);
  if (prevValRef.current !== value) {
    prevValRef.current = value;
    if (!gestureActive.value) posSV.value = value;
  }

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  function jsEmit(v: number) { onChangeRef.current(v); }

  const lo = min, hi = max, st = step;

  const pan = Gesture.Pan()
    .activeOffsetX([-3, 3])
    .failOffsetY([-8, 8])
    .onBegin(() => {
      gestureActive.value = true;
      startPosSV.value    = posSV.value;
      lastEmitted.value   = posSV.value;
    })
    .onUpdate((e) => {
      const rw = Math.max(1, trackWidthSV.value - THUMB_SIZE);
      const raw = startPosSV.value + (e.translationX / rw) * (hi - lo);
      posSV.value = Math.max(lo, Math.min(hi, raw));
      const snapped = Math.max(lo, Math.min(hi, Math.round((posSV.value - lo) / st) * st + lo));
      if (snapped !== lastEmitted.value) { lastEmitted.value = snapped; runOnJS(jsEmit)(snapped); }
    })
    .onEnd((e) => {
      const rw = Math.max(1, trackWidthSV.value - THUMB_SIZE);
      let final: number;
      if (Math.abs(e.translationX) < 8) {
        const rx = Math.max(0, Math.min(rw, e.x - THUMB_HALF));
        final = Math.max(lo, Math.min(hi, Math.round(lo + (rx / rw) * (hi - lo))));
      } else {
        final = Math.max(lo, Math.min(hi, Math.round((posSV.value - lo) / st) * st + lo));
      }
      posSV.value = withTiming(final, { duration: 100 });
      if (final !== lastEmitted.value) { lastEmitted.value = final; runOnJS(jsEmit)(final); }
    })
    .onFinalize(() => { gestureActive.value = false; });

  const thumbStyle = useAnimatedStyle(() => {
    const rw  = Math.max(0, trackWidthSV.value - THUMB_SIZE);
    const pct = Math.max(0, Math.min(1, (posSV.value - lo) / (hi - lo || 1)));
    return { left: rw * pct };
  });

  const fillStyle = useAnimatedStyle(() => {
    const rw  = Math.max(0, trackWidthSV.value - THUMB_SIZE);
    const pct = Math.max(0, Math.min(1, (posSV.value - lo) / (hi - lo || 1)));
    return { width: rw * pct };
  });

  const [trackW, setTrackW] = useState(0);
  const railW = Math.max(0, trackW - THUMB_SIZE);
  const range = hi - lo || 1;

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={styles.sliderTrack}
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          trackWidthSV.value = w;
          setTrackW(w);
        }}
      >
        <View style={[styles.sliderRail, { backgroundColor: c.surfaceTertiary }]} />
        {trackW > 0 && ticks.map((tv) => {
          const pct = Math.max(0, Math.min(1, (tv - lo) / range));
          return (
            <View key={tv} style={[styles.sliderDot, {
              left: THUMB_HALF + railW * pct - DOT_SIZE / 2,
              backgroundColor: tv <= value ? accentColor : c.surfaceTertiary,
            }]} />
          );
        })}
        <Animated.View style={[styles.sliderFill, { left: THUMB_HALF, backgroundColor: accentColor }, fillStyle]} />
        <Animated.View style={[styles.sliderThumb, { backgroundColor: accentColor }, thumbStyle]} />
      </Animated.View>
    </GestureDetector>
  );
}

function RawScoreInput({ label, skill, test, value, onChange, step = 0.5, min = 0, accentColor }: {
  label: string; skill: keyof LangScores; test: LanguageTest; value: string; onChange: (v: string) => void;
  step?: number; min?: number; max?: number; accentColor: string;
}) {
  const c = useColors();
  const cur = parseFloat(value) || min;
  const breakpoints = getClbBreakpoints(test, skill);
  const N = Math.max(breakpoints.length, 1);
  const curIdx = breakpoints.reduce<number>((best, t, i) =>
    Math.abs(t - cur) < Math.abs((breakpoints[best] ?? min) - cur) ? i : best, 0);
  const [bandMin, bandMax] = getClbBand(test, skill, cur);
  const fmt = (n: number) => step < 1 ? n.toFixed(1) : String(Math.round(n));
  const badge = bandMin === bandMax ? fmt(bandMin) : `${fmt(bandMin)} – ${fmt(bandMax)}`;
  const idxTicks = breakpoints.map((_, i) => i);

  return (
    <View style={[styles.sliderInputWrap, { backgroundColor: c.surfaceCard, borderColor: c.border }]}>
      <View style={styles.sliderHeader}>
        <Text style={[styles.scoreLabel, { color: c.textSecondary }]}>{label}</Text>
        <View style={[styles.bandBadge, { backgroundColor: accentColor + '18', borderColor: accentColor + '40' }]}>
          <Text style={[styles.bandBadgeText, { color: accentColor }]}>CLB {badge}</Text>
        </View>
      </View>
      <JSSlider
        key={`${test}-${skill}`}
        value={curIdx} min={0} max={N - 1} step={1} ticks={idxTicks}
        accentColor={accentColor}
        onChange={(idx) => {
          const rawScore = breakpoints[Math.round(idx)];
          if (rawScore !== undefined) onChange(step < 1 ? rawScore.toFixed(1) : String(Math.round(rawScore)));
        }}
      />
    </View>
  );
}

function CLBInput({ label, value, onChange, accentColor }: {
  label: string; value: string; onChange: (v: string) => void; accentColor: string;
}) {
  const c = useColors();
  const clb = parseInt(value, 10) || 0;
  return (
    <View style={[styles.sliderInputWrap, { backgroundColor: c.surfaceCard, borderColor: c.border }]}>
      <View style={styles.sliderHeader}>
        <Text style={[styles.scoreLabel, { color: c.textSecondary }]}>{label}</Text>
        <Text style={[styles.sliderValue, { color: accentColor }]}>CLB {clb}</Text>
      </View>
      <JSSlider value={clb} min={0} max={12} step={1} accentColor={accentColor}
        onChange={(v) => onChange(String(Math.round(v)))} />
    </View>
  );
}

// ─── Step helpers ───────────────────────────────────────────────────────────────

const EDU_OPTIONS: { label: string; value: EducationLevel }[] = [
  { label: 'Less than high school',         value: 'less_than_secondary' },
  { label: 'High school diploma',           value: 'secondary' },
  { label: '1-year diploma/certificate',    value: '1year' },
  { label: '2-year diploma/certificate',    value: '2year' },
  { label: "Bachelor's degree",             value: 'bachelors' },
  { label: 'Two or more certificates (3+ yr)', value: 'two_or_more' },
  { label: "Master's / professional degree", value: 'masters' },
  { label: 'PhD (doctoral degree)',          value: 'phd' },
];

const LANG_TEST_OPTIONS: { label: string; value: LanguageTest; hint: string }[] = [
  { label: 'IELTS',     value: 'IELTS',    hint: 'Band scores 0.0 – 9.0 (in 0.5 steps)' },
  { label: 'CELPIP',   value: 'CELPIP',   hint: 'Levels 1–12 (CELPIP = CLB directly)' },
  { label: 'PTE Core', value: 'PTE_CORE', hint: 'Scores 10–90 (integer)' },
  { label: 'TEF',      value: 'TEF',      hint: 'TEF Canada (French test)' },
  { label: 'TCF',      value: 'TCF',      hint: 'TCF Canada (French test)' },
];

// ─── Hint box ───────────────────────────────────────────────────────────────────

function HintBox({ icon, text, accent, c }: { icon: string; text: string; accent: string; c: Colors }) {
  return (
    <View style={[styles.hintBox, { backgroundColor: accent + '10', borderColor: accent + '30' }]}>
      <Ionicons name={icon as React.ComponentProps<typeof Ionicons>['name']} size={14} color={accent} />
      <Text style={[styles.hintText, { color: c.textSecondary }]}>{text}</Text>
    </View>
  );
}

// ─── Main ───────────────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const { setComplete } = useOnboardingStore();
  const saveProfile = useProfileStore((s) => s.save);
  const c = useColors();
  const accent = useAccentColor();
  const [step, setStep]     = useState(0);
  const [data, setData]     = useState<WizardData>(DEFAULT_DATA);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<ReturnType<typeof calculateCRS> | null>(null);
  const [suggestedCat, setSuggestedCat] = useState('CEC');

  const married = data.maritalStatus === 'married';
  const TOTAL_STEPS       = married ? 7 : 6;
  const LAST_CONTENT_STEP = married ? 6 : 5;

  function update<K extends keyof WizardData>(key: K, value: WizardData[K]) {
    setData((d) => ({ ...d, [key]: value }));
  }

  function buildInput(): CRSInput {
    return {
      maritalStatus: data.maritalStatus,
      age: parseInt(data.age, 10) || 30,
      education: data.education,
      canadianEducation: data.canadianEducation,
      firstLangTest: data.firstLangTest,
      firstLang: {
        speaking:  parseFloat(data.firstLangSpeaking)  || 0,
        listening: parseFloat(data.firstLangListening) || 0,
        reading:   parseFloat(data.firstLangReading)   || 0,
        writing:   parseFloat(data.firstLangWriting)   || 0,
      },
      hasSecondLang: data.hasSecondLang,
      secondLangTest: data.secondLangTest,
      secondLang: {
        speaking:  parseFloat(data.secondLangSpeaking)  || 0,
        listening: parseFloat(data.secondLangListening) || 0,
        reading:   parseFloat(data.secondLangReading)   || 0,
        writing:   parseFloat(data.secondLangWriting)   || 0,
      },
      canadianWorkExp: data.canadianWorkExp as CRSInput['canadianWorkExp'],
      foreignWorkExp:  data.foreignWorkExp  as CRSInput['foreignWorkExp'],
      spouseEducation: data.spouseEducation,
      spouseLang: {
        speaking:  parseInt(data.spouseLangSpeaking,  10) || 0,
        listening: parseInt(data.spouseLangListening, 10) || 0,
        reading:   parseInt(data.spouseLangReading,   10) || 0,
        writing:   parseInt(data.spouseLangWriting,   10) || 0,
      },
      spouseCanadianWorkExp: data.spouseCanadianWorkExp as CRSInput['spouseCanadianWorkExp'],
      hasProvincialNomination: data.hasProvincialNomination,
      jobOffer: data.jobOffer,
      hasSiblingInCanada: data.hasSiblingInCanada,
      hasTradeCert: data.hasTradeCert,
    };
  }

  function handleCalculate() {
    const input = buildInput();
    const calc = calculateCRS(input);
    const clb  = scoresToCLB(input.firstLangTest, input.firstLang);
    const cat  = suggestCategory(input, clb);
    setResult(calc);
    setSuggestedCat(cat);
    setStep((s) => s + 1);
  }

  async function handleSave() {
    if (!result) return;
    setSaving(true);
    try {
      await saveProfile({ crs_score: result.total, category: suggestedCat as Category });
    } catch (e) {
      console.warn('Failed to save profile', e);
    } finally {
      setSaving(false);
    }
    await setComplete();
  }

  function nextStep() {
    if (step === LAST_CONTENT_STEP) handleCalculate();
    else setStep((s) => s + 1);
  }

  function prevStep() { setStep((s) => Math.max(0, s - 1)); }

  const isLastStep = result !== null;
  const isBeforeResult = !result && step === LAST_CONTENT_STEP;

  // ─── Step renderer ─────────────────────────────────────────────────────────

  function renderStep() {

    // ── Welcome ──────────────────────────────────────────────────────────────
    if (step === 0) {
      return (
        <View style={styles.stepContent}>
          {/* Hero */}
          <View style={[styles.welcomeHero, { backgroundColor: c.surfaceCard, borderColor: c.border }]}>
            <View style={[styles.welcomeIconWrap, { backgroundColor: accent + '18', borderColor: accent + '30' }]}>
              <Ionicons name="calculator" size={44} color={accent} />
            </View>
            <Text style={[styles.welcomeBrand, { color: c.textPrimary }]}>CRS Pulse</Text>
            <Text style={[styles.welcomeTagline, { color: c.textSecondary }]}>
              Your Express Entry score tracker
            </Text>
          </View>

          {/* Heading */}
          <Text style={[styles.stepTitle, { color: c.textPrimary, marginTop: spacing.xl }]}>
            Calculate Your CRS Score
          </Text>
          <Text style={[styles.stepSubtitle, { color: c.textSecondary }]}>
            Answer a few questions to get your Comprehensive Ranking System score and plan your journey to Canada.
          </Text>

          {/* Feature list */}
          <View style={[styles.featureCard, { backgroundColor: c.surfaceCard, borderColor: c.border }]}>
            {[
              { icon: 'person-outline', label: 'Age & marital status' },
              { icon: 'school-outline', label: 'Education level' },
              { icon: 'language-outline', label: 'Language test scores' },
              { icon: 'briefcase-outline', label: 'Work experience' },
              { icon: 'star-outline', label: 'Additional factors' },
            ].map((item, i) => (
              <View
                key={item.label}
                style={[
                  styles.featureRow,
                  i > 0 && { borderTopWidth: 1, borderTopColor: c.border },
                ]}
              >
                <View style={[styles.featureIconWrap, { backgroundColor: accent + '18' }]}>
                  <Ionicons
                    name={item.icon as React.ComponentProps<typeof Ionicons>['name']}
                    size={15}
                    color={accent}
                  />
                </View>
                <Text style={[styles.featureLabel, { color: c.textSecondary }]}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={14} color={c.textMuted} />
              </View>
            ))}
          </View>

          {/* Time badge */}
          <View style={[styles.timeBadge, { backgroundColor: c.surfaceCard, borderColor: c.border }]}>
            <Ionicons name="time-outline" size={14} color={c.textMuted} />
            <Text style={[styles.timeBadgeText, { color: c.textMuted }]}>Takes about 3 minutes</Text>
          </View>
        </View>
      );
    }

    // ── Personal ─────────────────────────────────────────────────────────────
    if (step === 1) {
      const age = parseInt(data.age, 10) || 30;
      const ageHint = age <= 17 ? 'Under 18: 0 age points'
        : age <= 35 ? `Age ${age}: maximum age points available`
        : `Age ${age}: points decrease after 35`;
      return (
        <View style={styles.stepContent}>
          <Text style={[styles.stepTitle, { color: c.textPrimary }]}>Personal Information</Text>
          <Text style={[styles.stepSubtitle, { color: c.textSecondary }]}>Your age and marital status affect your CRS score</Text>

          <SectionLabel>MARITAL / PARTNER STATUS</SectionLabel>
          {[
            { label: 'Single', value: 'single' as MaritalStatus, icon: 'person-outline' },
            { label: 'Married / Common-law (partner immigrating)', value: 'married' as MaritalStatus, icon: 'people-outline' },
            { label: 'Married / Common-law (partner not immigrating)', value: 'married_not_accompanying' as MaritalStatus, icon: 'person-add-outline' },
          ].map((o) => (
            <OptionPill key={o.value} label={o.label} selected={data.maritalStatus === o.value} icon={o.icon} onPress={() => update('maritalStatus', o.value)} />
          ))}

          <SectionLabel style={{ marginTop: spacing.xl }}>YOUR AGE</SectionLabel>
          <NumberStepper value={age} onChange={(v) => update('age', String(v))} min={17} max={55} unit="years old" />
          <View style={[styles.ageHintRow, { backgroundColor: c.surfaceCard, borderColor: c.border }]}>
            <Ionicons name="information-circle-outline" size={14} color={c.textMuted} />
            <Text style={[styles.ageHint, { color: c.textMuted }]}>{ageHint}</Text>
          </View>
        </View>
      );
    }

    // ── Education ────────────────────────────────────────────────────────────
    if (step === 2) {
      return (
        <View style={styles.stepContent}>
          <Text style={[styles.stepTitle, { color: c.textPrimary }]}>Education</Text>
          <Text style={[styles.stepSubtitle, { color: c.textSecondary }]}>Your highest level of education completed</Text>

          <SectionLabel>HIGHEST EDUCATION LEVEL</SectionLabel>
          {EDU_OPTIONS.map((o) => (
            <OptionPill key={o.value} label={o.label} selected={data.education === o.value} onPress={() => update('education', o.value)} />
          ))}

          <SectionLabel style={{ marginTop: spacing.xl }}>CANADIAN EDUCATION</SectionLabel>
          {[
            { label: 'None (did not study in Canada)',             value: 'none' as const },
            { label: '1 or 2-year program in Canada',             value: '1_2year' as const },
            { label: '3+ year program or multiple (in Canada)',   value: '3year_plus' as const },
          ].map((o) => (
            <OptionPill key={o.value} label={o.label} selected={data.canadianEducation === o.value} onPress={() => update('canadianEducation', o.value)} />
          ))}
        </View>
      );
    }

    // ── Language ─────────────────────────────────────────────────────────────
    if (step === 3) {
      const isIELTS   = data.firstLangTest === 'IELTS';
      const isPTECore = data.firstLangTest === 'PTE_CORE';
      const useRawInput = isIELTS || isPTECore;
      return (
        <View style={styles.stepContent}>
          <Text style={[styles.stepTitle, { color: c.textPrimary }]}>First Official Language</Text>
          <Text style={[styles.stepSubtitle, { color: c.textSecondary }]}>English or French — enter your most recent test scores</Text>

          <SectionLabel>TEST TYPE</SectionLabel>
          <View style={styles.pillRow}>
            {LANG_TEST_OPTIONS.map((o) => (
              <OptionPill key={o.value} label={o.label} selected={data.firstLangTest === o.value}
                onPress={() => {
                  const defaults = o.value === 'IELTS' ? '7.0' : o.value === 'PTE_CORE' ? '68' : o.value === 'TEF' ? '310' : o.value === 'TCF' ? '10' : '7';
                  setData((d) => ({ ...d, firstLangTest: o.value, firstLangSpeaking: defaults, firstLangListening: defaults, firstLangReading: defaults, firstLangWriting: defaults }));
                }} />
            ))}
          </View>
          <HintBox
            icon="information-circle-outline"
            text={LANG_TEST_OPTIONS.find(o => o.value === data.firstLangTest)?.hint ?? ''}
            accent={accent}
            c={c}
          />

          <SectionLabel>SCORES</SectionLabel>
          {useRawInput && (() => {
            const clb = scoresToCLB(data.firstLangTest, {
              speaking: parseFloat(data.firstLangSpeaking) || 0,
              listening: parseFloat(data.firstLangListening) || 0,
              reading:  parseFloat(data.firstLangReading)   || 0,
              writing:  parseFloat(data.firstLangWriting)   || 0,
            });
            return (
              <View style={styles.clbSummary}>
                {(['speaking','listening','reading','writing'] as const).map((s) => (
                  <View key={s} style={[styles.clbChip, { backgroundColor: c.surfaceCard, borderColor: c.border }]}>
                    <Text style={[styles.clbChipLabel, { color: c.textMuted }]}>{s.slice(0,1).toUpperCase()}</Text>
                    <Text style={[styles.clbChipValue, { color: accent }]}>CLB {clb[s]}</Text>
                  </View>
                ))}
              </View>
            );
          })()}

          <View style={styles.slidersCol}>
            {useRawInput ? (
              <>
                <RawScoreInput label="Speaking"  skill="speaking"  test={data.firstLangTest} value={data.firstLangSpeaking}  onChange={(v) => update('firstLangSpeaking', v)}  step={isIELTS ? 0.5 : 1} min={isIELTS ? 0 : 10} accentColor={accent} />
                <RawScoreInput label="Listening" skill="listening" test={data.firstLangTest} value={data.firstLangListening} onChange={(v) => update('firstLangListening', v)} step={isIELTS ? 0.5 : 1} min={isIELTS ? 0 : 10} accentColor={accent} />
                <RawScoreInput label="Reading"   skill="reading"   test={data.firstLangTest} value={data.firstLangReading}   onChange={(v) => update('firstLangReading', v)}   step={isIELTS ? 0.5 : 1} min={isIELTS ? 0 : 10} accentColor={accent} />
                <RawScoreInput label="Writing"   skill="writing"   test={data.firstLangTest} value={data.firstLangWriting}   onChange={(v) => update('firstLangWriting', v)}   step={isIELTS ? 0.5 : 1} min={isIELTS ? 0 : 10} accentColor={accent} />
              </>
            ) : (
              <>
                <CLBInput label="Speaking"  value={data.firstLangSpeaking}  onChange={(v) => update('firstLangSpeaking', v)}  accentColor={accent} />
                <CLBInput label="Listening" value={data.firstLangListening} onChange={(v) => update('firstLangListening', v)} accentColor={accent} />
                <CLBInput label="Reading"   value={data.firstLangReading}   onChange={(v) => update('firstLangReading', v)}   accentColor={accent} />
                <CLBInput label="Writing"   value={data.firstLangWriting}   onChange={(v) => update('firstLangWriting', v)}   accentColor={accent} />
              </>
            )}
          </View>

          <OptionPill
            label={data.hasSecondLang ? 'Second language scores added' : 'Add second official language (optional)'}
            selected={data.hasSecondLang}
            icon={data.hasSecondLang ? 'checkmark-circle' : 'add-circle-outline'}
            onPress={() => update('hasSecondLang', !data.hasSecondLang)}
          />
          {data.hasSecondLang && (
            <>
              <SectionLabel>SECOND LANGUAGE TEST</SectionLabel>
              <View style={styles.pillRow}>
                {LANG_TEST_OPTIONS.map((o) => (
                  <OptionPill key={o.value} label={o.label} selected={data.secondLangTest === o.value} onPress={() => update('secondLangTest', o.value)} />
                ))}
              </View>
              <View style={styles.slidersCol}>
                <CLBInput label="Speaking"  value={data.secondLangSpeaking}  onChange={(v) => update('secondLangSpeaking', v)}  accentColor={accent} />
                <CLBInput label="Listening" value={data.secondLangListening} onChange={(v) => update('secondLangListening', v)} accentColor={accent} />
                <CLBInput label="Reading"   value={data.secondLangReading}   onChange={(v) => update('secondLangReading', v)}   accentColor={accent} />
                <CLBInput label="Writing"   value={data.secondLangWriting}   onChange={(v) => update('secondLangWriting', v)}   accentColor={accent} />
              </View>
            </>
          )}
        </View>
      );
    }

    // ── Work Experience ───────────────────────────────────────────────────────
    if (step === 4) {
      return (
        <View style={styles.stepContent}>
          <Text style={[styles.stepTitle, { color: c.textPrimary }]}>Work Experience</Text>
          <Text style={[styles.stepSubtitle, { color: c.textSecondary }]}>Count skilled work experience (NOC TEER 0, 1, 2, or 3)</Text>

          <SectionLabel>CANADIAN WORK EXPERIENCE</SectionLabel>
          <NumberStepper value={data.canadianWorkExp} onChange={(v) => update('canadianWorkExp', v)} min={0} max={5} unit={data.canadianWorkExp === 1 ? 'year' : 'years'} />

          <SectionLabel>FOREIGN WORK EXPERIENCE</SectionLabel>
          {[{ label: 'None', value: 0 }, { label: '1–2 years', value: 1 }, { label: '3+ years', value: 3 }].map((o) => (
            <OptionPill key={o.value} label={o.label} selected={data.foreignWorkExp === o.value} onPress={() => update('foreignWorkExp', o.value)} />
          ))}

          <HintBox
            icon="bulb-outline"
            text="Skilled work = NOC TEER 0, 1, 2, or 3. Part-time counts as half; 2 half-years = 1 full year."
            accent={palette.warning}
            c={c}
          />

          <SectionLabel>TRADE CERTIFICATE</SectionLabel>
          <OptionPill
            label={data.hasTradeCert ? 'I have a certificate of qualification (trade)' : 'Add trade certificate (optional)'}
            selected={data.hasTradeCert}
            icon={data.hasTradeCert ? 'ribbon' : 'ribbon-outline'}
            onPress={() => update('hasTradeCert', !data.hasTradeCert)}
          />
        </View>
      );
    }

    // ── Additional Factors ────────────────────────────────────────────────────
    if (step === 5) {
      return (
        <View style={styles.stepContent}>
          <Text style={[styles.stepTitle, { color: c.textPrimary }]}>Additional Factors</Text>
          <Text style={[styles.stepSubtitle, { color: c.textSecondary }]}>These can significantly boost your score</Text>

          <SectionLabel>PROVINCIAL / TERRITORIAL NOMINATION</SectionLabel>
          {[{ label: 'No nomination', value: false }, { label: 'Yes — I have a nomination', value: true }].map((o) => (
            <OptionPill key={String(o.value)} label={o.label} selected={data.hasProvincialNomination === o.value}
              {...(o.value ? { icon: 'star' } : {})} onPress={() => update('hasProvincialNomination', o.value)} />
          ))}
          {data.hasProvincialNomination && (
            <View style={[styles.bonusBox, { backgroundColor: palette.successLight, borderColor: palette.success + '30' }]}>
              <Ionicons name="trending-up" size={16} color={palette.success} />
              <Text style={[styles.bonusText, { color: palette.success }]}>+600 points — nearly guaranteed invitation</Text>
            </View>
          )}

          <View style={styles.labelRow}>
            <SectionLabel>VALID JOB OFFER</SectionLabel>
            <View style={[styles.deprecatedBadge, { backgroundColor: palette.warningLight, borderColor: palette.warning + '40' }]}>
              <Text style={[styles.deprecatedText, { color: palette.warning }]}>No longer counts (Mar 2025)</Text>
            </View>
          </View>
          {[
            { label: 'No job offer', value: 'none' as JobOfferType },
            { label: 'NOC TEER 00 (Senior management)', value: 'noc_00' as JobOfferType },
            { label: 'Other NOC TEER 0, 1, 2, or 3', value: 'other' as JobOfferType },
          ].map((o) => (
            <OptionPill key={o.value} label={o.label} selected={data.jobOffer === o.value} onPress={() => update('jobOffer', o.value)} />
          ))}

          <SectionLabel>OTHER FACTORS</SectionLabel>
          <OptionPill
            label={data.hasSiblingInCanada ? 'I have a sibling in Canada (citizen/PR)' : 'Add: sibling in Canada (optional)'}
            selected={data.hasSiblingInCanada}
            icon={data.hasSiblingInCanada ? 'people' : 'people-outline'}
            onPress={() => update('hasSiblingInCanada', !data.hasSiblingInCanada)}
          />
        </View>
      );
    }

    // ── Spouse ────────────────────────────────────────────────────────────────
    if (step === 6 && married) {
      return (
        <View style={styles.stepContent}>
          <Text style={[styles.stepTitle, { color: c.textPrimary }]}>Spouse / Partner Factors</Text>
          <Text style={[styles.stepSubtitle, { color: c.textSecondary }]}>Your spouse or common-law partner's profile (up to 40 pts)</Text>

          <SectionLabel>PARTNER'S EDUCATION</SectionLabel>
          {EDU_OPTIONS.map((o) => (
            <OptionPill key={o.value} label={o.label} selected={data.spouseEducation === o.value} onPress={() => update('spouseEducation', o.value)} />
          ))}

          <SectionLabel style={{ marginTop: spacing.xl }}>PARTNER'S LANGUAGE (CLB)</SectionLabel>
          <View style={styles.slidersCol}>
            <CLBInput label="Speaking"  value={data.spouseLangSpeaking}  onChange={(v) => update('spouseLangSpeaking', v)}  accentColor={accent} />
            <CLBInput label="Listening" value={data.spouseLangListening} onChange={(v) => update('spouseLangListening', v)} accentColor={accent} />
            <CLBInput label="Reading"   value={data.spouseLangReading}   onChange={(v) => update('spouseLangReading', v)}   accentColor={accent} />
            <CLBInput label="Writing"   value={data.spouseLangWriting}   onChange={(v) => update('spouseLangWriting', v)}   accentColor={accent} />
          </View>

          <SectionLabel>PARTNER'S CANADIAN WORK EXPERIENCE</SectionLabel>
          <NumberStepper value={data.spouseCanadianWorkExp} onChange={(v) => update('spouseCanadianWorkExp', v)} min={0} max={5} unit="years" />
        </View>
      );
    }

    // ── Result ────────────────────────────────────────────────────────────────
    if (result) {
      const score = result.total;
      const scoreColor = score >= 500 ? palette.success : score >= 450 ? palette.warning : palette.danger;
      const scoreBg    = score >= 500 ? palette.successLight : score >= 450 ? palette.warningLight : palette.dangerLight;
      const statusText = score >= 500 ? 'Strong profile — well above recent cut-offs'
        : score >= 460 ? 'Good profile — near recent cut-offs'
        : score >= 400 ? 'Moderate — work on boosting your score'
        : 'Keep building your profile to increase your score';
      const statusIcon = score >= 460 ? 'trending-up' : 'trending-down';
      const breakdown = [
        { label: 'Age',               pts: result.agePoints },
        { label: 'Education',         pts: result.educationPoints },
        { label: 'First Language',    pts: result.firstLangPoints },
        { label: 'Second Language',   pts: result.secondLangPoints },
        { label: 'Canadian Work Exp.',pts: result.canadianWorkExpPoints },
        ...(married ? [
          { label: 'Spouse Education', pts: result.spouseEducationPoints },
          { label: 'Spouse Language',  pts: result.spouseLangPoints },
          { label: 'Spouse Work Exp.', pts: result.spouseWorkExpPoints },
        ] : []),
        { label: 'Skill Transferability', pts: result.skillTransferPoints },
        { label: 'Additional Factors',    pts: result.additionalPoints },
      ].filter((r) => r.pts > 0);

      return (
        <View style={styles.stepContent}>
          {/* Score ring */}
          <View style={styles.scoreRingSection}>
            <Text style={[styles.crsLabel, { color: c.textMuted }]}>CRS SCORE</Text>
            <View style={[styles.scoreCircle, {
              borderColor: scoreColor,
              backgroundColor: c.surfaceCard,
              shadowColor: scoreColor,
            }]}>
              <Text style={[styles.bigScore, { color: scoreColor }]}>{score}</Text>
              <Text style={[styles.bigScoreLabel, { color: c.textMuted }]}>/ 1200</Text>
            </View>
          </View>

          {/* Status */}
          <View style={[styles.statusBox, { backgroundColor: scoreBg, borderColor: scoreColor + '40' }]}>
            <Ionicons name={statusIcon as React.ComponentProps<typeof Ionicons>['name']} size={16} color={scoreColor} />
            <Text style={[styles.statusText, { color: scoreColor }]}>{statusText}</Text>
          </View>

          {/* Breakdown */}
          <SectionLabel>SCORE BREAKDOWN</SectionLabel>
          <View style={[styles.breakdownTable, { backgroundColor: c.surfaceCard, borderColor: c.border }]}>
            {breakdown.map((row, i) => (
              <View key={row.label} style={[
                styles.breakdownRow,
                { borderTopColor: c.border },
                i > 0 && { borderTopWidth: 1 },
              ]}>
                <Text style={[styles.breakdownLabel, { color: c.textSecondary }]}>{row.label}</Text>
                <View style={[styles.breakdownPtsBadge, { backgroundColor: palette.success + '18' }]}>
                  <Text style={[styles.breakdownPts, { color: palette.success }]}>+{row.pts}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Category */}
          <SectionLabel>SUGGESTED CATEGORY</SectionLabel>
          {['CEC', 'General', 'Healthcare', 'STEM', 'Trades', 'French'].map((cat) => (
            <OptionPill
              key={cat}
              label={cat === suggestedCat ? `${cat} — Recommended for you` : cat}
              selected={suggestedCat === cat}
              {...(suggestedCat === cat ? { icon: 'star' } : {})}
              onPress={() => setSuggestedCat(cat)}
            />
          ))}
        </View>
      );
    }

    return null;
  }

  // ─── Step label data ────────────────────────────────────────────────────────

  const stepLabels = married
    ? ['Welcome', 'Personal', 'Education', 'Language', 'Work Exp.', 'Additional', 'Spouse', 'Result']
    : ['Welcome', 'Personal', 'Education', 'Language', 'Work Exp.', 'Additional', 'Your Score'];
  const stepLabel = stepLabels[step] ?? '';

  // ─── Layout ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.surfacePrimary }]}>

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        {step > 0 && !isLastStep ? (
          <TouchableOpacity onPress={prevStep} style={styles.headerBtn}>
            <Ionicons name="chevron-back" size={22} color={c.textSecondary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerBtn} />
        )}
        <View style={styles.headerCenter}>
          {!isLastStep && step > 0 && (
            <Text style={[styles.stepCounter, { color: c.textMuted }]}>
              {step} / {TOTAL_STEPS - 1}
            </Text>
          )}
          <Text style={[styles.stepLabelText, { color: c.textSecondary }]}>{stepLabel}</Text>
        </View>
        {step === 0 ? (
          <TouchableOpacity onPress={() => setComplete()} style={styles.headerBtn}>
            <Text style={[styles.skipText, { color: c.textMuted }]}>Skip</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerBtn} />
        )}
      </View>

      {/* Progress dots */}
      {!isLastStep && step > 0 && (
        <View style={styles.dotsRow}>
          {Array.from({ length: TOTAL_STEPS - 1 }).map((_, i) => {
            const done    = i < step - 1;
            const current = i === step - 1;
            return (
              <View key={i} style={[
                styles.dot,
                { backgroundColor: c.surfaceTertiary },
                done    && { backgroundColor: accent + '60', width: 8 },
                current && { backgroundColor: accent, width: 20 },
              ]} />
            );
          })}
        </View>
      )}

      {/* Scrollable content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {renderStep()}
      </ScrollView>

      {/* Footer CTA */}
      <View style={[styles.footer, { borderTopColor: c.border }]}>
        {isLastStep ? (
          <TouchableOpacity
            style={[styles.ctaBtn, { backgroundColor: accent }, saving && styles.ctaBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={palette.white} />
            ) : (
              <>
                <Text style={styles.ctaBtnText}>Save & Go to Dashboard</Text>
                <Ionicons name="arrow-forward" size={18} color={palette.white} />
              </>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.ctaBtn, { backgroundColor: accent }]} onPress={nextStep}>
            <Text style={styles.ctaBtnText}>
              {step === 0 ? 'Get Started' : isBeforeResult ? 'Calculate Score' : 'Continue'}
            </Text>
            <Ionicons
              name={isBeforeResult ? 'calculator' : step === 0 ? 'arrow-forward' : 'chevron-forward'}
              size={18}
              color={palette.white}
            />
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1 },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    minHeight: 52,
    borderBottomWidth: 1,
  },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  stepCounter: { fontSize: typography.xs, fontWeight: typography.medium, letterSpacing: 0.5 },
  stepLabelText: { fontSize: typography.sm, marginTop: 2 },
  skipText: { fontSize: typography.sm },

  // ── Progress dots ──
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
  },
  dot: {
    height: 8,
    width: 8,
    borderRadius: 4,
  },

  // ── Scroll ──
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.base, paddingBottom: spacing.xl * 2 },
  stepContent: { paddingTop: spacing.xl },

  // ── Welcome ──
  welcomeHero: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    alignItems: 'center',
    paddingVertical: spacing['2xl'],
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  welcomeIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.base,
  },
  welcomeBrand: {
    fontSize: typography['3xl'],
    fontWeight: typography.black,
    letterSpacing: -0.5,
    marginBottom: spacing.xs,
  },
  welcomeTagline: {
    fontSize: typography.base,
    textAlign: 'center',
  },
  featureCard: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    marginTop: spacing.sm,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    gap: spacing.md,
  },
  featureIconWrap: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureLabel: {
    flex: 1,
    fontSize: typography.base,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    alignSelf: 'center',
    marginTop: spacing.base,
  },
  timeBadgeText: { fontSize: typography.sm },

  // ── Typography ──
  stepTitle: {
    fontSize: typography['3xl'],
    fontWeight: typography.black,
    letterSpacing: -0.5,
    marginBottom: spacing.sm,
  },
  stepSubtitle: {
    fontSize: typography.base,
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  sectionLabel: {
    fontSize: typography.xs,
    fontWeight: typography.bold,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
    marginTop: spacing.base,
  },

  // ── Pill option ──
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.sm,
    minHeight: 52,
  },
  pillInner: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  pillIcon: { marginRight: spacing.sm },
  pillText: { fontSize: typography.base, flex: 1 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },

  // ── Stepper ──
  stepperCard: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.base,
    marginBottom: spacing.base,
  },
  stepperLabel: {
    fontSize: typography.sm,
    fontWeight: typography.semibold,
    marginBottom: spacing.base,
  },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepBtn: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValue: {
    fontSize: typography.xl,
    fontWeight: typography.bold,
    flex: 1,
    textAlign: 'center',
  },

  // ── Age hint ──
  ageHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.md,
    marginTop: spacing.xs,
    marginBottom: spacing.base,
  },
  ageHint: { fontSize: typography.sm, flex: 1 },

  // ── Hint box ──
  hintBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.md,
    marginVertical: spacing.base,
  },
  hintText: { flex: 1, fontSize: typography.sm, lineHeight: 18 },

  // ── CLB chips ──
  clbSummary: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  clbChip: {
    flex: 1,
    alignItems: 'center',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    paddingVertical: spacing.sm,
  },
  clbChipLabel: { fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5 },
  clbChipValue: { fontSize: typography.sm, fontWeight: typography.bold, marginTop: 2 },

  // ── Sliders ──
  slidersCol: { gap: spacing.xs, marginBottom: spacing.base },
  sliderInputWrap: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    marginBottom: spacing.xs,
  },
  sliderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  scoreLabel: { fontSize: typography.xs, textTransform: 'uppercase', letterSpacing: 0.5 },
  sliderValue: { fontSize: typography.sm, fontWeight: typography.bold },
  bandBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1 },
  bandBadgeText: { fontSize: typography.sm, fontWeight: typography.semibold },
  sliderTrack: { height: 44, justifyContent: 'center', marginVertical: 2 },
  sliderRail: { position: 'absolute', left: THUMB_HALF, right: THUMB_HALF, height: 4, borderRadius: 2 },
  sliderFill: { position: 'absolute', height: 4, borderRadius: 2 },
  sliderDot: { position: 'absolute', width: DOT_SIZE, height: DOT_SIZE, borderRadius: DOT_SIZE / 2, top: (44 - DOT_SIZE) / 2 },
  sliderThumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_HALF,
    top: (44 - THUMB_SIZE) / 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
    elevation: 4,
    borderWidth: 3,
    borderColor: palette.white,
  },

  // ── Labels row ──
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.base, marginBottom: spacing.sm },
  deprecatedBadge: { borderRadius: borderRadius.xs, borderWidth: 1, paddingHorizontal: 6, paddingVertical: 2 },
  deprecatedText: { fontSize: typography.xs },

  // ── Bonus box ──
  bonusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.base,
  },
  bonusText: { fontSize: typography.sm, fontWeight: typography.semibold, flex: 1 },

  // ── Result: Score ring ──
  scoreRingSection: { alignItems: 'center', marginBottom: spacing.xl },
  crsLabel: {
    fontSize: typography.xs,
    fontWeight: typography.bold,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: spacing.base,
  },
  scoreCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  bigScore: { fontSize: 60, fontWeight: '900', lineHeight: 66 },
  bigScoreLabel: { fontSize: typography.xs, letterSpacing: 0.5 },

  // ── Result: Status ──
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.base,
    marginBottom: spacing.xl,
  },
  statusText: { flex: 1, fontSize: typography.sm, fontWeight: typography.semibold, lineHeight: 18 },

  // ── Result: Breakdown ──
  breakdownTable: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: spacing.base,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
  },
  breakdownLabel: { fontSize: typography.sm },
  breakdownPtsBadge: { borderRadius: borderRadius.sm, paddingHorizontal: 8, paddingVertical: 3 },
  breakdownPts: { fontSize: typography.sm, fontWeight: typography.bold },

  // ── Footer ──
  footer: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.xl,
    height: 56,
    gap: spacing.sm,
  },
  ctaBtnDisabled: { opacity: 0.6 },
  ctaBtnText: { color: palette.white, fontSize: typography.base, fontWeight: typography.bold },
});
