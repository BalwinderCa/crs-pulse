import type { CalcInputs } from '@/store/profileStore';
import type { CRSInput, LanguageTest, TefScale } from './crsCalculator';

/**
 * Maps the calculator's UI test labels to the calculator's `LanguageTest` codes.
 * Shared so every screen (dashboard, profile, analytics what-if) converts the
 * stored `CalcInputs` into a `CRSInput` exactly the same way.
 */
export const LANG_TEST_MAP: Record<string, LanguageTest> = {
  IELTS: 'IELTS',
  CELPIP: 'CELPIP',
  'PTE Core': 'PTE_CORE',
  TEF: 'TEF',
  TCF: 'TCF',
  // Passthrough codes (used programmatically, e.g. the analytics what-if injects
  // CLB levels directly rather than raw test scores).
  CLB: 'CLB',
  PTE_CORE: 'PTE_CORE',
};

/**
 * Single source of truth for `CalcInputs` → `CRSInput`. Defensive about numeric
 * coercion (stored values can be strings/NaN) and spouse-language CLB clamping.
 */
export function buildCRSInput(d: CalcInputs): CRSInput {
  const firstTest = (LANG_TEST_MAP[d.firstLangTest] ?? 'IELTS') as LanguageTest;
  const secondTest = (LANG_TEST_MAP[d.secondLangTest] ?? 'TEF') as LanguageTest;
  const clb = (v: number) => Math.min(12, Math.max(0, Math.round(Number(v) || 0)));
  return {
    age: d.age,
    maritalStatus: d.maritalStatus,
    education: d.education as CRSInput['education'],
    canadianEducation: d.canadianEducation,
    firstLangTest: firstTest,
    firstLang: {
      speaking: Number(d.firstLangSpeaking) || 0,
      listening: Number(d.firstLangListening) || 0,
      reading: Number(d.firstLangReading) || 0,
      writing: Number(d.firstLangWriting) || 0,
    },
    hasSecondLang: d.hasSecondLang,
    secondLangTest: secondTest,
    secondLang: {
      speaking: Number(d.secondLangSpeaking) || 0,
      listening: Number(d.secondLangListening) || 0,
      reading: Number(d.secondLangReading) || 0,
      writing: Number(d.secondLangWriting) || 0,
    },
    canadianWorkExp: Math.min(5, d.canadianWorkExp) as CRSInput['canadianWorkExp'],
    foreignWorkExp: d.foreignWorkExp as CRSInput['foreignWorkExp'],
    spouseEducation: d.spouseEducation as CRSInput['spouseEducation'],
    spouseLang: {
      speaking: clb(d.spouseLangSpeaking),
      listening: clb(d.spouseLangListening),
      reading: clb(d.spouseLangReading),
      writing: clb(d.spouseLangWriting),
    },
    spouseCanadianWorkExp: Math.min(5, d.spouseCanadianWorkExp) as CRSInput['spouseCanadianWorkExp'],
    hasProvincialNomination: d.hasProvincialNomination,
    jobOffer: d.jobOffer as CRSInput['jobOffer'],
    hasSiblingInCanada: d.hasSiblingInCanada,
    hasTradeCert: d.hasTradeCert,
    tefScale: (d.tefScale ?? 'current') as TefScale,
  };
}
