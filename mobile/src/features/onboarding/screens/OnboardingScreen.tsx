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

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Sub-components ───────────────────────────────────────────────────────────

function OptionPill({
  label,
  selected,
  onPress,
  icon,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: string;
}) {
  return (
    <TouchableOpacity
      style={[styles.pill, selected && styles.pillSelected]}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
    >
      {icon && (
        <Ionicons
          name={icon as React.ComponentProps<typeof Ionicons>['name']}
          size={16}
          color={selected ? palette.white : palette.textSecondary}
          style={{ marginRight: 6 }}
        />
      )}
      <Text style={[styles.pillText, selected && styles.pillTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

function NumberStepper({
  value,
  onChange,
  min = 0,
  max = 10,
  label,
  unit,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  label?: string;
  unit?: string;
}) {
  return (
    <View style={styles.stepperRow}>
      {label && <Text style={styles.stepperLabel}>{label}</Text>}
      <View style={styles.stepper}>
        <TouchableOpacity
          style={[styles.stepBtn, value <= min && styles.stepBtnDisabled]}
          onPress={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
        >
          <Ionicons name="remove" size={18} color={value <= min ? palette.textMuted : palette.white} />
        </TouchableOpacity>
        <Text style={styles.stepValue}>
          {value === max ? `${value}+` : value}
          {unit ? ` ${unit}` : ''}
        </Text>
        <TouchableOpacity
          style={[styles.stepBtn, value >= max && styles.stepBtnDisabled]}
          onPress={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
        >
          <Ionicons name="add" size={18} color={value >= max ? palette.textMuted : palette.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Slider — Reanimated v3 + RNGH v2, runs on UI thread ────────────────────────

const THUMB_SIZE = 28;
const THUMB_HALF = THUMB_SIZE / 2;
const DOT_SIZE   = 6;

function JSSlider({
  value, min, max, step, onChange, ticks = [],
}: {
  value: number; min: number; max: number; step: number; onChange: (v: number) => void;
  ticks?: number[];
}) {
  const trackWidthSV  = useSharedValue(0);
  const posSV         = useSharedValue(value);
  const startPosSV    = useSharedValue(value);
  const lastEmitted   = useSharedValue<number>(-Infinity); // dedup onChange calls
  const gestureActive = useSharedValue(false);

  // Sync prop → shared value ONLY when no gesture is running.
  // Prevents external state update from fighting the ongoing drag.
  const prevValRef = useRef(value);
  if (prevValRef.current !== value) {
    prevValRef.current = value;
    if (!gestureActive.value) posSV.value = value;
  }

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  function jsEmit(v: number) { onChangeRef.current(v); }

  // Worklets capture these at gesture-creation time (stable within one mount
  // because RawScoreInput passes key={test+skill} to force remount on change)
  const lo = min, hi = max, st = step;

  const pan = Gesture.Pan()
    // Only activate on horizontal movement — lets ScrollView handle vertical scroll
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
      // Only call JS when snapped index actually changes → avoids per-frame re-renders
      const snapped = Math.max(lo, Math.min(hi,
        Math.round((posSV.value - lo) / st) * st + lo));
      if (snapped !== lastEmitted.value) {
        lastEmitted.value = snapped;
        runOnJS(jsEmit)(snapped);
      }
    })
    .onEnd((e) => {
      const rw = Math.max(1, trackWidthSV.value - THUMB_SIZE);
      let final: number;
      if (Math.abs(e.translationX) < 8) {
        // Tap-seek: jump to tapped position
        const rx = Math.max(0, Math.min(rw, e.x - THUMB_HALF));
        final = Math.max(lo, Math.min(hi, Math.round(lo + (rx / rw) * (hi - lo))));
      } else {
        final = Math.max(lo, Math.min(hi,
          Math.round((posSV.value - lo) / st) * st + lo));
      }
      posSV.value = withTiming(final, { duration: 100 });
      if (final !== lastEmitted.value) {
        lastEmitted.value = final;
        runOnJS(jsEmit)(final);
      }
    })
    .onFinalize(() => {
      gestureActive.value = false;
    });

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
        style={jsSliderStyles.track}
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          trackWidthSV.value = w;
          setTrackW(w);
        }}
      >
        <View style={jsSliderStyles.rail} />
        {trackW > 0 && ticks.map((tv) => {
          const pct = Math.max(0, Math.min(1, (tv - lo) / range));
          return (
            <View key={tv} style={[jsSliderStyles.dot, {
              left: THUMB_HALF + railW * pct - DOT_SIZE / 2,
              backgroundColor: tv <= value ? palette.white : palette.surfaceTertiary,
            }]} />
          );
        })}
        <Animated.View style={[jsSliderStyles.fill, { left: THUMB_HALF }, fillStyle]} />
        <Animated.View style={[jsSliderStyles.thumb, thumbStyle]} />
      </Animated.View>
    </GestureDetector>
  );
}

const jsSliderStyles = StyleSheet.create({
  track: { height: 44, justifyContent: 'center', marginVertical: 2 },
  rail: {
    position: 'absolute',
    left: THUMB_HALF, right: THUMB_HALF,
    height: 4, borderRadius: 2,
    backgroundColor: palette.surfaceTertiary,
  },
  fill: {
    position: 'absolute',
    height: 4, borderRadius: 2,
    backgroundColor: palette.blue,
  },
  dot: {
    position: 'absolute',
    width: DOT_SIZE, height: DOT_SIZE, borderRadius: DOT_SIZE / 2,
    top: (44 - DOT_SIZE) / 2,
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE, height: THUMB_SIZE, borderRadius: THUMB_HALF,
    backgroundColor: palette.blue,
    top: (44 - THUMB_SIZE) / 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35, shadowRadius: 3, elevation: 4,
    borderWidth: 3, borderColor: palette.white,
  },
});

// Raw score input — slider operates in CLB-INDEX space so every level is equally wide.
// This prevents the "unequal dead zones" problem (e.g. CLB 9→10 span is tiny in raw score space).
function RawScoreInput({
  label, skill, test, value, onChange, step = 0.5, min = 0,
}: {
  label: string;
  skill: keyof LangScores;
  test: LanguageTest;
  value: string;
  onChange: (v: string) => void;
  step?: number;
  min?: number;
  max?: number; // kept for API compat, overridden by ticks
}) {
  const cur = parseFloat(value) || min;

  // breakpoints[i] = minimum raw score for the i-th CLB slot
  const breakpoints = getClbBreakpoints(test, skill);
  const N = Math.max(breakpoints.length, 1);

  // Current slider index = nearest breakpoint index
  const curIdx = breakpoints.reduce<number>((best, t, i) =>
    Math.abs(t - cur) < Math.abs((breakpoints[best] ?? min) - cur) ? i : best, 0);

  // Badge: show raw-score range for current CLB band
  const [bandMin, bandMax] = getClbBand(test, skill, cur);
  const fmt = (n: number) => step < 1 ? n.toFixed(1) : String(Math.round(n));
  const badge = bandMin === bandMax ? fmt(bandMin) : `${fmt(bandMin)} – ${fmt(bandMax)}`;

  // Dots at each integer index position (0 … N-1), equally spaced
  const idxTicks = breakpoints.map((_, i) => i);

  return (
    <View style={styles.sliderInputWrap}>
      <View style={styles.sliderHeader}>
        <Text style={styles.scoreLabel}>{label}</Text>
        <View style={styles.bandBadge}>
          <Text style={styles.bandBadgeText}>{badge}</Text>
        </View>
      </View>
      <JSSlider
        key={`${test}-${skill}`}
        value={curIdx}
        min={0}
        max={N - 1}
        step={1}
        ticks={idxTicks}
        onChange={(idx) => {
          const rawScore = breakpoints[Math.round(idx)];
          if (rawScore !== undefined) {
            onChange(step < 1 ? rawScore.toFixed(1) : String(Math.round(rawScore)));
          }
        }}
      />
    </View>
  );
}

// CLB input with JS slider (CLB 0–12)
function CLBInput({
  label, value, onChange,
}: {
  label: string; value: string; onChange: (v: string) => void;
}) {
  const clb = parseInt(value, 10) || 0;
  return (
    <View style={styles.sliderInputWrap}>
      <View style={styles.sliderHeader}>
        <Text style={styles.scoreLabel}>{label}</Text>
        <Text style={styles.sliderValue}>CLB {clb}</Text>
      </View>
      <JSSlider value={clb} min={0} max={12} step={1}
        onChange={(v) => onChange(String(Math.round(v)))} />
    </View>
  );
}

// ─── Step helpers ─────────────────────────────────────────────────────────────

const EDU_OPTIONS: { label: string; value: EducationLevel }[] = [
  { label: 'Less than high school', value: 'less_than_secondary' },
  { label: 'High school diploma', value: 'secondary' },
  { label: '1-year diploma/certificate', value: '1year' },
  { label: '2-year diploma/certificate', value: '2year' },
  { label: "Bachelor's degree", value: 'bachelors' },
  { label: 'Two or more certificates (3+ yr)', value: 'two_or_more' },
  { label: "Master's / professional degree", value: 'masters' },
  { label: 'PhD (doctoral degree)', value: 'phd' },
];

const LANG_TEST_OPTIONS: { label: string; value: LanguageTest; hint: string }[] = [
  { label: 'IELTS',     value: 'IELTS',    hint: 'Band scores 0.0 – 9.0 (in 0.5 steps)' },
  { label: 'CELPIP',   value: 'CELPIP',   hint: 'Levels 1–12 (CELPIP = CLB directly)' },
  { label: 'PTE Core', value: 'PTE_CORE', hint: 'Scores 10–90 (integer)' },
  { label: 'TEF',      value: 'TEF',      hint: 'TEF Canada (French test)' },
  { label: 'TCF',      value: 'TCF',      hint: 'TCF Canada (French test)' },
];



// ─── Main Component ───────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const { setComplete } = useOnboardingStore();
  const saveProfile = useProfileStore((s) => s.save);
  const [step, setStep] = useState(0);
  const [data, setData] = useState<WizardData>(DEFAULT_DATA);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<ReturnType<typeof calculateCRS> | null>(null);
  const [suggestedCat, setSuggestedCat] = useState('CEC');

  const married = data.maritalStatus === 'married';
  // Single: steps 0-5 (Welcome,Personal,Education,Language,Work,Additional) → result on step 6
  // Married: steps 0-6 (+ Spouse) → result on step 7
  const TOTAL_STEPS = married ? 7 : 6;
  const LAST_CONTENT_STEP = married ? 6 : 5; // step that triggers calculation on "Continue"

  function update<K extends keyof WizardData>(key: K, value: WizardData[K]) {
    setData((d) => ({ ...d, [key]: value }));
  }

  // Convert wizard data to CRSInput
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
    const clb = scoresToCLB(input.firstLangTest, input.firstLang);
    const cat = suggestCategory(input, clb);
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
    if (step === LAST_CONTENT_STEP) {
      handleCalculate();
    } else {
      setStep((s) => s + 1);
    }
  }

  function prevStep() { setStep((s) => Math.max(0, s - 1)); }

  const progress = (step / TOTAL_STEPS) * 100;

  // ── Render steps ────────────────────────────────────────────────────────────

  function renderStep() {
    // Step 0: Welcome
    if (step === 0) {
      return (
        <View style={styles.stepContent}>
          <View style={styles.welcomeIcon}>
            <Ionicons name="calculator" size={40} color={palette.blue} />
          </View>
          <Text style={styles.stepTitle}>Calculate Your CRS Score</Text>
          <Text style={styles.stepSubtitle}>
            Answer a few questions about your profile to calculate your Comprehensive Ranking System score for Express Entry.
          </Text>
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={16} color={palette.blue} />
            <Text style={styles.infoText}>
              Takes about 3 minutes. You can update your score anytime from Profile.
            </Text>
          </View>
          <View style={styles.checkList}>
            {['Age & marital status','Education','Language test scores','Work experience','Additional factors'].map((item) => (
              <View key={item} style={styles.checkItem}>
                <Ionicons name="checkmark-circle" size={16} color={palette.success} />
                <Text style={styles.checkText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>
      );
    }

    // Step 1: Personal
    if (step === 1) {
      return (
        <View style={styles.stepContent}>
          <Text style={styles.stepTitle}>Personal Information</Text>
          <Text style={styles.stepSubtitle}>Your age and marital status affect your CRS score</Text>

          <Text style={styles.fieldLabel}>Marital / Partner Status</Text>
          {[
            { label: 'Single', value: 'single' as MaritalStatus, icon: 'person-outline' },
            { label: 'Married / Common-law (partner immigrating)', value: 'married' as MaritalStatus, icon: 'people-outline' },
            { label: 'Married / Common-law (partner not immigrating)', value: 'married_not_accompanying' as MaritalStatus, icon: 'person-add-outline' },
          ].map((o) => (
            <OptionPill key={o.value} label={o.label} selected={data.maritalStatus === o.value}
              icon={o.icon} onPress={() => update('maritalStatus', o.value)} />
          ))}

          <Text style={[styles.fieldLabel, { marginTop: spacing.xl }]}>Your Age</Text>
          <NumberStepper
            value={parseInt(data.age, 10) || 30}
            onChange={(v) => update('age', String(v))}
            min={17} max={55}
            unit="years old"
          />
          <Text style={styles.ageHint}>
            {(() => {
              const a = parseInt(data.age, 10) || 30;
              if (a <= 17) return 'Under 18: 0 points for age';
              if (a <= 35) return `Age ${a}: maximum age points available`;
              return `Age ${a}: points decrease after 35`;
            })()}
          </Text>
        </View>
      );
    }

    // Step 2: Education
    if (step === 2) {
      return (
        <View style={styles.stepContent}>
          <Text style={styles.stepTitle}>Education</Text>
          <Text style={styles.stepSubtitle}>Your highest level of education completed</Text>

          <Text style={styles.fieldLabel}>Highest Education Level</Text>
          {EDU_OPTIONS.map((o) => (
            <OptionPill key={o.value} label={o.label} selected={data.education === o.value}
              onPress={() => update('education', o.value)} />
          ))}

          <Text style={[styles.fieldLabel, { marginTop: spacing.xl }]}>Canadian Education</Text>
          {[
            { label: 'None (did not study in Canada)', value: 'none' as const },
            { label: '1 or 2-year program in Canada', value: '1_2year' as const },
            { label: '3+ year program or multiple (in Canada)', value: '3year_plus' as const },
          ].map((o) => (
            <OptionPill key={o.value} label={o.label} selected={data.canadianEducation === o.value}
              onPress={() => update('canadianEducation', o.value)} />
          ))}
        </View>
      );
    }

    // Step 3: First Language
    if (step === 3) {
      const isIELTS    = data.firstLangTest === 'IELTS';
      const isPTECore  = data.firstLangTest === 'PTE_CORE';
      const useRawInput = isIELTS || isPTECore; // decimal/integer raw scores
      return (
        <View style={styles.stepContent}>
          <Text style={styles.stepTitle}>First Official Language</Text>
          <Text style={styles.stepSubtitle}>English or French — enter your most recent test scores</Text>

          <Text style={styles.fieldLabel}>Test Type</Text>
          <View style={styles.pillRow}>
            {LANG_TEST_OPTIONS.map((o) => (
              <OptionPill key={o.value} label={o.label} selected={data.firstLangTest === o.value}
                onPress={() => {
                  const defaults = o.value === 'IELTS' ? '7.0'
                    : o.value === 'PTE_CORE' ? '68'
                    : o.value === 'TEF' ? '310'
                    : o.value === 'TCF' ? '10'
                    : '7';
                  setData((d) => ({
                    ...d,
                    firstLangTest: o.value,
                    firstLangSpeaking: defaults,
                    firstLangListening: defaults,
                    firstLangReading: defaults,
                    firstLangWriting: defaults,
                  }));
                }} />
            ))}
          </View>

          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={14} color={palette.blue} />
            <Text style={styles.infoText}>{LANG_TEST_OPTIONS.find(o => o.value === data.firstLangTest)?.hint}</Text>
          </View>

          <Text style={styles.fieldLabel}>Scores</Text>
          {/* Helper: show CLB for raw-score tests */}
          {useRawInput && (() => {
            const clb = scoresToCLB(data.firstLangTest, {
              speaking:  parseFloat(data.firstLangSpeaking)  || 0,
              listening: parseFloat(data.firstLangListening) || 0,
              reading:   parseFloat(data.firstLangReading)   || 0,
              writing:   parseFloat(data.firstLangWriting)   || 0,
            });
            return (
              <View style={styles.clbSummary}>
                {(['speaking','listening','reading','writing'] as const).map((s) => (
                  <View key={s} style={styles.clbChip}>
                    <Text style={styles.clbChipLabel}>{s.slice(0,1).toUpperCase()}</Text>
                    <Text style={styles.clbChipValue}>CLB {clb[s]}</Text>
                  </View>
                ))}
              </View>
            );
          })()}
          <View style={styles.slidersCol}>
            {useRawInput ? (
              <>
                <RawScoreInput label="Speaking"  skill="speaking"  test={data.firstLangTest} value={data.firstLangSpeaking}  onChange={(v) => update('firstLangSpeaking', v)}  step={isIELTS ? 0.5 : 1} min={isIELTS ? 0 : 10} max={isIELTS ? 9 : 90} />
                <RawScoreInput label="Listening" skill="listening" test={data.firstLangTest} value={data.firstLangListening} onChange={(v) => update('firstLangListening', v)} step={isIELTS ? 0.5 : 1} min={isIELTS ? 0 : 10} max={isIELTS ? 9 : 90} />
                <RawScoreInput label="Reading"   skill="reading"   test={data.firstLangTest} value={data.firstLangReading}   onChange={(v) => update('firstLangReading', v)}   step={isIELTS ? 0.5 : 1} min={isIELTS ? 0 : 10} max={isIELTS ? 9 : 90} />
                <RawScoreInput label="Writing"   skill="writing"   test={data.firstLangTest} value={data.firstLangWriting}   onChange={(v) => update('firstLangWriting', v)}   step={isIELTS ? 0.5 : 1} min={isIELTS ? 0 : 10} max={isIELTS ? 9 : 90} />
              </>
            ) : (
              <>
                <CLBInput label="Speaking"  value={data.firstLangSpeaking}  onChange={(v) => update('firstLangSpeaking', v)} />
                <CLBInput label="Listening" value={data.firstLangListening} onChange={(v) => update('firstLangListening', v)} />
                <CLBInput label="Reading"   value={data.firstLangReading}   onChange={(v) => update('firstLangReading', v)} />
                <CLBInput label="Writing"   value={data.firstLangWriting}   onChange={(v) => update('firstLangWriting', v)} />
              </>
            )}
          </View>

          <OptionPill
            label={data.hasSecondLang ? '✓ I have second language scores' : 'Add second official language (optional)'}
            selected={data.hasSecondLang}
            icon={data.hasSecondLang ? 'checkmark-circle' : 'add-circle-outline'}
            onPress={() => update('hasSecondLang', !data.hasSecondLang)}
          />
          {data.hasSecondLang && (
            <>
              <Text style={styles.fieldLabel}>Second Language Test</Text>
              <View style={styles.pillRow}>
                {LANG_TEST_OPTIONS.map((o) => (
                  <OptionPill key={o.value} label={o.label} selected={data.secondLangTest === o.value}
                    onPress={() => update('secondLangTest', o.value)} />
                ))}
              </View>
              <View style={styles.slidersCol}>
                <CLBInput label="Speaking"  value={data.secondLangSpeaking}  onChange={(v) => update('secondLangSpeaking', v)} />
                <CLBInput label="Listening" value={data.secondLangListening} onChange={(v) => update('secondLangListening', v)} />
                <CLBInput label="Reading"   value={data.secondLangReading}   onChange={(v) => update('secondLangReading', v)} />
                <CLBInput label="Writing"   value={data.secondLangWriting}   onChange={(v) => update('secondLangWriting', v)} />
              </View>
            </>
          )}
        </View>
      );
    }

    // Step 4: Work Experience
    if (step === 4) {
      return (
        <View style={styles.stepContent}>
          <Text style={styles.stepTitle}>Work Experience</Text>
          <Text style={styles.stepSubtitle}>Count skilled work experience (NOC TEER 0, 1, 2, or 3)</Text>

          <NumberStepper
            label="Canadian Work Experience"
            value={data.canadianWorkExp}
            onChange={(v) => update('canadianWorkExp', v)}
            min={0} max={5}
            unit={data.canadianWorkExp === 5 ? 'years' : data.canadianWorkExp === 1 ? 'year' : 'years'}
          />

          <Text style={styles.fieldLabel}>Foreign Work Experience</Text>
          {[
            { label: 'None', value: 0 },
            { label: '1–2 years', value: 1 },
            { label: '3+ years', value: 3 },
          ].map((o) => (
            <OptionPill key={o.value} label={o.label} selected={data.foreignWorkExp === o.value}
              onPress={() => update('foreignWorkExp', o.value)} />
          ))}

          <View style={styles.infoBox}>
            <Ionicons name="bulb-outline" size={14} color={palette.warning} />
            <Text style={styles.infoText}>
              Skilled work = NOC TEER 0, 1, 2, or 3. Part-time counts as half; 2 half-years = 1 full year.
            </Text>
          </View>

          <Text style={styles.fieldLabel}>Trade Certificate</Text>
          <OptionPill
            label={data.hasTradeCert ? '✓ I have a trade certificate' : 'I have a certificate of qualification (trade)'}
            selected={data.hasTradeCert}
            icon={data.hasTradeCert ? 'checkmark-circle' : 'ribbon-outline'}
            onPress={() => update('hasTradeCert', !data.hasTradeCert)}
          />
        </View>
      );
    }

    // Step 5: Additional Factors
    if (step === 5) {
      return (
        <View style={styles.stepContent}>
          <Text style={styles.stepTitle}>Additional Factors</Text>
          <Text style={styles.stepSubtitle}>These can significantly increase your score</Text>

          <Text style={styles.fieldLabel}>Provincial / Territorial Nomination</Text>
          {[{ label: 'No nomination', value: false }, { label: 'Yes — I have a nomination', value: true }].map((o) => (
            <OptionPill key={String(o.value)} label={o.label} selected={data.hasProvincialNomination === o.value}
              {...(o.value ? { icon: 'star' } : {})}
              onPress={() => update('hasProvincialNomination', o.value)} />
          ))}
          {data.hasProvincialNomination && (
            <View style={styles.bonusBox}>
              <Text style={styles.bonusText}>+600 points — nearly guaranteed invitation</Text>
            </View>
          )}

          <View style={styles.fieldLabelRow}>
            <Text style={[styles.fieldLabel, { marginTop: 0, marginBottom: 0 }]}>Valid Job Offer</Text>
            <Text style={styles.deprecatedBadge}>No longer counts (Mar 2025)</Text>
          </View>
          {[
            { label: 'No job offer', value: 'none' as JobOfferType },
            { label: 'NOC TEER 00 (Senior management)', value: 'noc_00' as JobOfferType },
            { label: 'Other NOC TEER 0, 1, 2, or 3', value: 'other' as JobOfferType },
          ].map((o) => (
            <OptionPill key={o.value} label={o.label} selected={data.jobOffer === o.value}
              onPress={() => update('jobOffer', o.value)} />
          ))}

          <Text style={styles.fieldLabel}>Other Factors</Text>
          <OptionPill
            label={data.hasSiblingInCanada ? '✓ I have a sibling in Canada (citizen/PR)' : 'Sibling in Canada (citizen or PR)'}
            selected={data.hasSiblingInCanada}
            icon={data.hasSiblingInCanada ? 'checkmark-circle' : 'people-outline'}
            onPress={() => update('hasSiblingInCanada', !data.hasSiblingInCanada)}
          />
        </View>
      );
    }

    // Step 6: Spouse (only if married)
    if (step === 6 && married) {
      return (
        <View style={styles.stepContent}>
          <Text style={styles.stepTitle}>Spouse / Partner Factors</Text>
          <Text style={styles.stepSubtitle}>Your spouse or common-law partner's profile (up to 40 pts)</Text>

          <Text style={styles.fieldLabel}>Partner's Education</Text>
          {EDU_OPTIONS.map((o) => (
            <OptionPill key={o.value} label={o.label} selected={data.spouseEducation === o.value}
              onPress={() => update('spouseEducation', o.value)} />
          ))}

          <Text style={[styles.fieldLabel, { marginTop: spacing.xl }]}>Partner's Language (CLB levels)</Text>
          <View style={styles.slidersCol}>
            <CLBInput label="Speaking"  value={data.spouseLangSpeaking}  onChange={(v) => update('spouseLangSpeaking', v)} />
            <CLBInput label="Listening" value={data.spouseLangListening} onChange={(v) => update('spouseLangListening', v)} />
            <CLBInput label="Reading"   value={data.spouseLangReading}   onChange={(v) => update('spouseLangReading', v)} />
            <CLBInput label="Writing"   value={data.spouseLangWriting}   onChange={(v) => update('spouseLangWriting', v)} />
          </View>

          <NumberStepper
            label="Partner's Canadian Work Experience"
            value={data.spouseCanadianWorkExp}
            onChange={(v) => update('spouseCanadianWorkExp', v)}
            min={0} max={5}
            unit="years"
          />
        </View>
      );
    }

    // Result step (last)
    if (result) {
      const score = result.total;
      const scoreColor =
        score >= 500 ? palette.success :
        score >= 450 ? palette.warning :
        palette.danger;

      const breakdown = [
        { label: 'Age', pts: result.agePoints },
        { label: 'Education', pts: result.educationPoints },
        { label: 'First Language', pts: result.firstLangPoints },
        { label: 'Second Language', pts: result.secondLangPoints },
        { label: 'Canadian Work Exp.', pts: result.canadianWorkExpPoints },
        ...(married ? [
          { label: 'Spouse Education', pts: result.spouseEducationPoints },
          { label: 'Spouse Language', pts: result.spouseLangPoints },
          { label: 'Spouse Work Exp.', pts: result.spouseWorkExpPoints },
        ] : []),
        { label: 'Skill Transferability', pts: result.skillTransferPoints },
        { label: 'Additional Factors', pts: result.additionalPoints },
      ].filter((r) => r.pts > 0);

      return (
        <View style={styles.stepContent}>
          <Text style={styles.stepTitle}>Your CRS Score</Text>

          <View style={styles.scoreCircle}>
            <Text style={[styles.bigScore, { color: scoreColor }]}>{score}</Text>
            <Text style={styles.bigScoreLabel}>out of 1,200</Text>
          </View>

          <View style={[styles.infoBox, { borderColor: scoreColor + '40', backgroundColor: scoreColor + '15' }]}>
            <Ionicons name={score >= 470 ? 'trending-up' : 'trending-down'} size={16} color={scoreColor} />
            <Text style={[styles.infoText, { color: scoreColor }]}>
              {score >= 500 ? 'High chance — well above recent cut-offs' :
               score >= 460 ? 'Good chance — near recent cut-offs' :
               score >= 400 ? 'Moderate — work on boosting your score' :
               'Build your profile to increase your score'}
            </Text>
          </View>

          <Text style={styles.fieldLabel}>Score Breakdown</Text>
          <View style={styles.breakdownTable}>
            {breakdown.map((row) => (
              <View key={row.label} style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>{row.label}</Text>
                <Text style={styles.breakdownPts}>+{row.pts}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Suggested Category</Text>
          {['CEC', 'General', 'Healthcare', 'STEM', 'Trades', 'French'].map((cat) => (
            <OptionPill
              key={cat}
              label={cat === suggestedCat ? `★ ${cat} (recommended)` : cat}
              selected={suggestedCat === cat}
              onPress={() => setSuggestedCat(cat)}
            />
          ))}
        </View>
      );
    }

    return null;
  }

  // Determine step label
  const stepLabels = married
    ? ['Welcome', 'Personal', 'Education', 'Language', 'Work Exp.', 'Additional', 'Spouse', 'Result']
    : ['Welcome', 'Personal', 'Education', 'Language', 'Work Exp.', 'Additional', 'Your Score'];
  const stepLabel = stepLabels[step] ?? '';
  const isLastStep = result !== null;
  const isBeforeResult = !result && step === LAST_CONTENT_STEP;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        {step > 0 && !isLastStep && (
          <TouchableOpacity onPress={prevStep} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={palette.textSecondary} />
          </TouchableOpacity>
        )}
        <View style={styles.headerCenter}>
          <Text style={styles.stepIndicator}>
            {isLastStep ? 'Result' : `Step ${step} of ${TOTAL_STEPS - 1}`}
          </Text>
          <Text style={styles.stepLabelText}>{stepLabel}</Text>
        </View>
        {step === 0 && (
          <TouchableOpacity onPress={() => setComplete()} style={styles.skipBtn}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Progress bar */}
      {!isLastStep && (
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
      )}

      {/* Content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {renderStep()}
      </ScrollView>

      {/* Footer buttons */}
      <View style={styles.footer}>
        {isLastStep ? (
          <TouchableOpacity
            style={[styles.nextBtn, saving && styles.nextBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={palette.white} />
            ) : (
              <>
                <Text style={styles.nextBtnText}>Save & Go to Dashboard</Text>
                <Ionicons name="arrow-forward" size={18} color={palette.white} />
              </>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.nextBtn} onPress={nextStep}>
            <Text style={styles.nextBtnText}>
              {step === 0 ? 'Get Started' : isBeforeResult ? 'Calculate Score' : 'Continue'}
            </Text>
            <Ionicons name={isBeforeResult ? 'calculator' : 'arrow-forward'} size={18} color={palette.white} />
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.surfacePrimary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: spacing.base,
    minHeight: 56,
  },
  backBtn: { padding: spacing.sm, marginRight: spacing.sm },
  skipBtn: { padding: spacing.sm },
  skipText: { color: palette.textMuted, fontSize: typography.sm },
  headerCenter: { flex: 1, alignItems: 'center' },
  stepIndicator: { color: palette.textMuted, fontSize: typography.xs, fontWeight: typography.medium },
  stepLabelText: { color: palette.textSecondary, fontSize: typography.sm, marginTop: 2 },
  progressTrack: {
    height: 3,
    backgroundColor: palette.surfaceTertiary,
    marginHorizontal: spacing.base,
    borderRadius: 2,
  },
  progressFill: {
    height: 3,
    backgroundColor: palette.blue,
    borderRadius: 2,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.base, paddingBottom: spacing.xl },
  stepContent: { paddingTop: spacing.xl },
  // Welcome
  welcomeIcon: {
    alignSelf: 'center',
    width: 80, height: 80,
    borderRadius: 20,
    backgroundColor: palette.surfaceCard,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  checkList: { marginTop: spacing.xl, gap: spacing.md },
  checkItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  checkText: { color: palette.textSecondary, fontSize: typography.base },
  // Titles
  stepTitle: {
    color: palette.textPrimary,
    fontSize: typography['2xl'],
    fontWeight: typography.bold,
    marginBottom: spacing.sm,
  },
  stepSubtitle: {
    color: palette.textSecondary,
    fontSize: typography.base,
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  fieldLabel: {
    color: palette.textPrimary,
    fontSize: typography.sm,
    fontWeight: typography.semibold,
    marginBottom: spacing.sm,
    marginTop: spacing.base,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.base,
    marginBottom: spacing.sm,
  },
  deprecatedBadge: {
    fontSize: typography.xs,
    color: palette.warning,
    backgroundColor: palette.warningLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  // Pills
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: palette.surfaceTertiary,
    backgroundColor: palette.surfaceCard,
    marginBottom: spacing.sm,
  },
  pillSelected: { borderColor: palette.blue, backgroundColor: palette.blueFaint },
  pillText: { color: palette.textSecondary, fontSize: typography.base },
  pillTextSelected: { color: palette.white, fontWeight: typography.semibold },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  // Stepper
  stepperRow: { marginBottom: spacing.base },
  stepperLabel: { color: palette.textPrimary, fontSize: typography.base, fontWeight: typography.semibold, marginBottom: spacing.sm },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.xl },
  stepBtn: {
    width: 44, height: 44,
    borderRadius: 22,
    backgroundColor: palette.blue,
    alignItems: 'center', justifyContent: 'center',
  },
  stepBtnDisabled: { backgroundColor: palette.surfaceTertiary },
  stepValue: { color: palette.white, fontSize: typography.xl, fontWeight: typography.bold, minWidth: 80, textAlign: 'center' },
  ageHint: { color: palette.textMuted, fontSize: typography.xs, marginTop: spacing.sm },
  // CLB live summary bar
  clbSummary: {
    flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm,
  },
  clbChip: {
    flex: 1, alignItems: 'center',
    backgroundColor: palette.surfaceCard,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.xs,
  },
  clbChipLabel: { color: palette.textMuted, fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5 },
  clbChipValue: { color: palette.blue, fontSize: typography.sm, fontWeight: typography.bold },
  // Score inputs
  scoresGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.base },
  // Slider-based score inputs
  slidersCol: { gap: spacing.xs, marginBottom: spacing.base },
  sliderInputWrap: {
    backgroundColor: palette.surfaceCard,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  sliderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  scoreLabel: { color: palette.textSecondary, fontSize: typography.xs, textTransform: 'uppercase', letterSpacing: 0.5 },
  sliderValue: { color: palette.blue, fontSize: typography.sm, fontWeight: typography.bold },
  bandBadge: {
    backgroundColor: palette.surfaceSecondary,
    borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 2,
    borderWidth: 1, borderColor: palette.blue + '40',
  },
  bandBadgeText: { color: palette.blue, fontSize: typography.sm, fontWeight: typography.semibold },
  slider: { width: '100%', height: 36 },
  scoreHint: { color: palette.blue, fontSize: 10, marginTop: 2 },
  // Info box
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: palette.blueFaint,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: palette.blue + '40',
    padding: spacing.md,
    marginVertical: spacing.base,
  },
  infoText: { flex: 1, color: palette.textSecondary, fontSize: typography.sm, lineHeight: 18 },
  bonusBox: {
    backgroundColor: palette.successLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.base,
  },
  bonusText: { color: palette.success, fontSize: typography.sm, fontWeight: typography.semibold },
  // Result
  scoreCircle: {
    alignSelf: 'center',
    alignItems: 'center',
    backgroundColor: palette.surfaceCard,
    borderRadius: 100,
    width: 160, height: 160,
    justifyContent: 'center',
    marginVertical: spacing.xl,
    borderWidth: 3,
    borderColor: palette.surfaceTertiary,
  },
  bigScore: { fontSize: 56, fontWeight: '900' },
  bigScoreLabel: { color: palette.textMuted, fontSize: typography.xs },
  breakdownTable: { backgroundColor: palette.surfaceCard, borderRadius: borderRadius.md, overflow: 'hidden' },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: palette.surfaceTertiary,
  },
  breakdownLabel: { color: palette.textSecondary, fontSize: typography.sm },
  breakdownPts: { color: palette.success, fontSize: typography.sm, fontWeight: typography.bold },
  // Footer
  footer: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.base,
    borderTopWidth: 1,
    borderTopColor: palette.surfaceTertiary,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.blue,
    borderRadius: borderRadius.md,
    height: 56,
    gap: spacing.sm,
  },
  nextBtnDisabled: { opacity: 0.6 },
  nextBtnText: { color: palette.white, fontSize: typography.base, fontWeight: typography.bold },
});
