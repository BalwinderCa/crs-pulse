// ─── Official IRCC CRS Calculator ────────────────────────────────────────────
// Based on: https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/eligibility/criteria-comprehensive-ranking-system/grid.html

export type MaritalStatus = 'single' | 'married' | 'married_not_accompanying';

export type EducationLevel =
  | 'less_than_secondary'
  | 'secondary'
  | '1year'
  | '2year'
  | 'bachelors'
  | 'two_or_more'
  | 'masters'
  | 'phd';

export type LanguageTest = 'IELTS' | 'CELPIP' | 'PTE_CORE' | 'TEF' | 'TCF' | 'CLB';

/** TEF Canada score scale — IRCC uses different tables by test date. Default `current` (after Dec 10, 2023). */
export type TefScale = 'current' | 'oct2019' | 'legacy';

export type LangScores = {
  speaking: number;
  listening: number;
  reading: number;
  writing: number;
};

export type JobOfferType = 'none' | 'noc_00' | 'other';

export type CRSInput = {
  maritalStatus: MaritalStatus;
  age: number;
  education: EducationLevel;
  canadianEducation: 'none' | '1_2year' | '3year_plus';
  firstLangTest: LanguageTest;
  firstLang: LangScores;           // raw test scores or CLB if test=CLB
  hasSecondLang: boolean;
  secondLangTest: LanguageTest;
  secondLang: LangScores;
  canadianWorkExp: 0 | 1 | 2 | 3 | 4 | 5; // 5 = 5+ years
  foreignWorkExp: 0 | 1 | 3;               // 0, 1-2, 3+
  // Spouse/partner factors (only used when maritalStatus = 'married')
  spouseEducation: EducationLevel;
  spouseLang: LangScores;          // CLB levels
  spouseCanadianWorkExp: 0 | 1 | 2 | 3 | 4 | 5;
  // Additional
  hasProvincialNomination: boolean;
  jobOffer: JobOfferType;
  hasSiblingInCanada: boolean;
  hasTradeCert: boolean;           // certificate of qualification
  /** TEF scale when first or second language test is TEF. Defaults to post-Dec 2023 table. */
  tefScale?: TefScale;
};

export type CRSBreakdown = {
  // A: Core / Human Capital
  agePoints: number;
  educationPoints: number;
  firstLangPoints: number;
  secondLangPoints: number;
  canadianWorkExpPoints: number;
  coreTotal: number;
  // Spouse
  spouseEducationPoints: number;
  spouseLangPoints: number;
  spouseWorkExpPoints: number;
  spouseTotal: number;
  // B: Skill Transferability
  skillTransferPoints: number;
  eduTransferPoints: number;
  workTransferPoints: number;
  // C: Additional
  additionalPoints: number;
  // Grand total
  total: number;
  // First lang CLB values (for display)
  firstLangClb: LangScores;
};

// ─── IELTS → CLB ─────────────────────────────────────────────────────────────

function ieltsToCLB(skill: keyof LangScores, score: number): number {
  if (skill === 'speaking') {
    if (score >= 7.5) return 10;
    if (score >= 7.0) return 9;
    if (score >= 6.5) return 8;
    if (score >= 6.0) return 7;
    if (score >= 5.5) return 6;
    if (score >= 5.0) return 5;
    if (score >= 4.0) return 4;
    return 0;
  }
  if (skill === 'listening') {
    if (score >= 8.5) return 10;
    if (score >= 8.0) return 9;
    if (score >= 7.5) return 8;
    if (score >= 6.0) return 7;
    if (score >= 5.5) return 6;
    if (score >= 5.0) return 5;
    if (score >= 4.5) return 4;
    return 0;
  }
  if (skill === 'reading') {
    if (score >= 8.0) return 10;
    if (score >= 7.0) return 9;
    if (score >= 6.5) return 8;
    if (score >= 6.0) return 7;
    if (score >= 5.0) return 6;
    if (score >= 4.0) return 5;
    if (score >= 3.5) return 4;
    return 0;
  }
  // writing
  if (score >= 7.5) return 10;
  if (score >= 7.0) return 9;
  if (score >= 6.5) return 8;
  if (score >= 6.0) return 7;
  if (score >= 5.5) return 6;
  if (score >= 5.0) return 5;
  if (score >= 4.0) return 4;
  return 0;
}

// TEF Canada → CLB/NCLC (tests after December 10, 2023 — default as of 2026)
function tefToCLBCurrent(skill: keyof LangScores, score: number): number {
  const mins: Record<keyof LangScores, [number, number, number, number, number, number, number]> = {
    speaking:  [556, 518, 494, 456, 422, 387, 328],
    listening: [546, 503, 462, 434, 393, 352, 306],
    reading:   [546, 503, 462, 434, 393, 352, 306],
    writing:   [558, 512, 472, 428, 379, 330, 268],
  };
  const t = mins[skill];
  if (score >= t[0]) return 10;
  if (score >= t[1]) return 9;
  if (score >= t[2]) return 8;
  if (score >= t[3]) return 7;
  if (score >= t[4]) return 6;
  if (score >= t[5]) return 5;
  if (score >= t[6]) return 4;
  return 0;
}

// TEF Canada → CLB (Oct 1, 2019 – December 10, 2023)
function tefToCLBOct2019(_skill: keyof LangScores, score: number): number {
  if (score >= 566) return 10;
  if (score >= 533) return 9;
  if (score >= 500) return 8;
  if (score >= 450) return 7;
  if (score >= 400) return 6;
  if (score >= 350) return 5;
  if (score >= 300) return 4;
  return 0;
}

// TEF Canada → CLB (before September 30, 2019)
function tefToCLBLegacy(skill: keyof LangScores, score: number): number {
  if (skill === 'speaking') {
    if (score >= 393) return 10;
    if (score >= 371) return 9;
    if (score >= 349) return 8;
    if (score >= 310) return 7;
    if (score >= 271) return 6;
    if (score >= 226) return 5;
    if (score >= 181) return 4;
    return 0;
  }
  if (skill === 'listening') {
    if (score >= 316) return 10;
    if (score >= 298) return 9;
    if (score >= 280) return 8;
    if (score >= 249) return 7;
    if (score >= 217) return 6;
    if (score >= 181) return 5;
    if (score >= 145) return 4;
    return 0;
  }
  if (skill === 'reading') {
    if (score >= 263) return 10;
    if (score >= 248) return 9;
    if (score >= 233) return 8;
    if (score >= 207) return 7;
    if (score >= 181) return 6;
    if (score >= 151) return 5;
    if (score >= 121) return 4;
    return 0;
  }
  // writing
  if (score >= 393) return 10;
  if (score >= 371) return 9;
  if (score >= 349) return 8;
  if (score >= 310) return 7;
  if (score >= 271) return 6;
  if (score >= 226) return 5;
  if (score >= 181) return 4;
  return 0;
}

function tefToCLB(skill: keyof LangScores, score: number, scale: TefScale = 'current'): number {
  if (scale === 'oct2019') return tefToCLBOct2019(skill, score);
  if (scale === 'legacy') return tefToCLBLegacy(skill, score);
  return tefToCLBCurrent(skill, score);
}

// TCF → CLB
function tcfToCLB(skill: keyof LangScores, score: number): number {
  if (skill === 'speaking') {
    if (score >= 16) return 10;
    if (score >= 14) return 9;
    if (score >= 12) return 8;
    if (score >= 10) return 7;
    if (score >= 7)  return 6;
    if (score >= 6)  return 5;
    if (score >= 4)  return 4;
    return 0;
  }
  if (skill === 'listening') {
    if (score >= 549) return 10;
    if (score >= 523) return 9;
    if (score >= 503) return 8;
    if (score >= 458) return 7;
    if (score >= 398) return 6;
    if (score >= 369) return 5;
    if (score >= 331) return 4;
    return 0;
  }
  if (skill === 'reading') {
    if (score >= 549) return 10;
    if (score >= 524) return 9;
    if (score >= 499) return 8;
    if (score >= 453) return 7;
    if (score >= 406) return 6;
    if (score >= 375) return 5;
    if (score >= 342) return 4;
    return 0;
  }
  // writing
  if (score >= 16) return 10;
  if (score >= 14) return 9;
  if (score >= 12) return 8;
  if (score >= 10) return 7;
  if (score >= 7)  return 6;
  if (score >= 6)  return 5;
  if (score >= 4)  return 4;
  return 0;
}

// PTE Core → CLB (IRCC official table, scores 10–90)
function pteCoreToCLB(skill: keyof LangScores, score: number): number {
  if (skill === 'speaking') {
    if (score >= 89) return 10;
    if (score >= 84) return 9;
    if (score >= 76) return 8;
    if (score >= 68) return 7;
    if (score >= 59) return 6;
    if (score >= 51) return 5;
    if (score >= 42) return 4;
    return 0;
  }
  if (skill === 'listening') {
    if (score >= 89) return 10;
    if (score >= 82) return 9;
    if (score >= 71) return 8;
    if (score >= 60) return 7;
    if (score >= 50) return 6;
    if (score >= 39) return 5;
    if (score >= 28) return 4;
    return 0;
  }
  if (skill === 'reading') {
    if (score >= 88) return 10;
    if (score >= 78) return 9;
    if (score >= 69) return 8;
    if (score >= 60) return 7;
    if (score >= 51) return 6;
    if (score >= 42) return 5;
    if (score >= 33) return 4;
    return 0;
  }
  // writing
  if (score >= 90) return 10;
  if (score >= 88) return 9;
  if (score >= 79) return 8;
  if (score >= 69) return 7;
  if (score >= 60) return 6;
  if (score >= 51) return 5;
  if (score >= 41) return 4;
  return 0;
}

export function toCLB(
  test: LanguageTest,
  skill: keyof LangScores,
  score: number,
  tefScale: TefScale = 'current',
): number {
  if (test === 'CELPIP' || test === 'CLB') return Math.min(12, Math.max(0, Math.round(score)));
  if (test === 'IELTS')    return ieltsToCLB(skill, score);
  if (test === 'PTE_CORE') return pteCoreToCLB(skill, score);
  if (test === 'TEF')      return tefToCLB(skill, score, tefScale);
  if (test === 'TCF')      return tcfToCLB(skill, score);
  return 0;
}

export function scoresToCLB(
  test: LanguageTest,
  scores: LangScores,
  tefScale: TefScale = 'current',
): LangScores {
  return {
    speaking:  toCLB(test, 'speaking',  scores.speaking,  tefScale),
    listening: toCLB(test, 'listening', scores.listening, tefScale),
    reading:   toCLB(test, 'reading',   scores.reading,   tefScale),
    writing:   toCLB(test, 'writing',   scores.writing,   tefScale),
  };
}

// ─── CLB Snap Breakpoints ─────────────────────────────────────────────────────
// Returns sorted array of raw scores that are the minimum for each CLB band.
// These are used as slider snap-points (tick marks on the track).
// First element = lowest possible score for that test/skill (represents "below CLB 4").

type TestRange = { min: number; max: number; step: number };

const TEST_RANGES: Record<Exclude<LanguageTest, 'TEF' | 'TCF'>, TestRange> = {
  IELTS:    { min: 0,   max: 9,   step: 0.5 },
  CELPIP:   { min: 1,   max: 12,  step: 1   },
  CLB:      { min: 0,   max: 12,  step: 1   },
  PTE_CORE: { min: 10,  max: 90,  step: 1   },
};

// TEF/TCF score scales vary by skill and (for TEF) by test date:
//   TEF since Oct 2019: all four skills normalized to 0–699
//   TEF legacy (pre Oct 2019): raw scales — speaking/writing 0–450,
//     listening 0–360, reading 0–300
//   TCF: listening/reading 0–699, speaking/writing 0–20
export function getTestRange(
  test: LanguageTest,
  skill: keyof LangScores,
  tefScale: TefScale = 'current',
): TestRange {
  if (test === 'TEF') {
    if (tefScale === 'legacy') {
      if (skill === 'listening') return { min: 0, max: 360, step: 1 };
      if (skill === 'reading')   return { min: 0, max: 300, step: 1 };
      return { min: 0, max: 450, step: 1 };
    }
    return { min: 0, max: 699, step: 1 };
  }
  if (test === 'TCF') {
    if (skill === 'speaking' || skill === 'writing') return { min: 0, max: 20, step: 1 };
    return { min: 0, max: 699, step: 1 };
  }
  return TEST_RANGES[test];
}

export function getClbBreakpoints(
  test: LanguageTest,
  skill: keyof LangScores,
  tefScale: TefScale = 'current',
): number[] {
  const { min, max, step } = getTestRange(test, skill, tefScale);
  const breaks: number[] = [min]; // first snap = test minimum (below CLB 4)
  let prevClb = toCLB(test, skill, min, tefScale);

  for (let s = min + step; s <= max + 0.001; s += step) {
    const sc = parseFloat(s.toFixed(2));
    const clb = toCLB(test, skill, sc, tefScale);
    if (clb !== prevClb) {
      breaks.push(sc);
      prevClb = clb;
    }
  }
  return breaks;
}

// Returns [bandMin, bandMax] for the CLB band at the given score
export function getClbBand(
  test: LanguageTest,
  skill: keyof LangScores,
  score: number,
  tefScale: TefScale = 'current',
): [number, number] {
  const breaks = getClbBreakpoints(test, skill, tefScale);
  const { max } = getTestRange(test, skill, tefScale);
  if (breaks.length === 0) return [score, score];
  let lower = breaks[0] ?? 0;
  let upperIdx = 1;
  for (let i = 0; i < breaks.length; i++) {
    if (score >= (breaks[i] ?? 0)) { lower = breaks[i] ?? lower; upperIdx = i + 1; }
  }
  const nextBreak = breaks[upperIdx];
  const upper = upperIdx < breaks.length && nextBreak !== undefined
    ? nextBreak - (test === 'IELTS' ? 0.5 : 1)
    : max;
  return [lower, upper];
}

// ─── Points tables ────────────────────────────────────────────────────────────

// Age — married vs single
// IRCC CRS grid (modified 2025-08-21): peak 20–29, decline from 30, zero at 45+
const AGE_POINTS_SINGLE: Record<number, number> = {
  17: 0, 18: 99, 19: 105, 20: 110, 21: 110, 22: 110, 23: 110, 24: 110,
  25: 110, 26: 110, 27: 110, 28: 110, 29: 110, 30: 105, 31: 99, 32: 94,
  33: 88, 34: 83, 35: 77, 36: 72, 37: 66, 38: 61, 39: 55, 40: 50,
  41: 39, 42: 28, 43: 17, 44: 6, 45: 0, 46: 0, 47: 0, 48: 0,
  49: 0, 50: 0, 51: 0, 52: 0, 53: 0, 54: 0, 55: 0,
};

const AGE_POINTS_MARRIED: Record<number, number> = {
  17: 0, 18: 90, 19: 95, 20: 100, 21: 100, 22: 100, 23: 100, 24: 100,
  25: 100, 26: 100, 27: 100, 28: 100, 29: 100, 30: 95, 31: 90, 32: 85,
  33: 80, 34: 75, 35: 70, 36: 65, 37: 60, 38: 55, 39: 50, 40: 45,
  41: 35, 42: 25, 43: 15, 44: 5, 45: 0, 46: 0, 47: 0, 48: 0,
  49: 0, 50: 0, 51: 0, 52: 0, 53: 0, 54: 0, 55: 0,
};

function agePoints(age: number, married: boolean): number {
  const table = married ? AGE_POINTS_MARRIED : AGE_POINTS_SINGLE;
  const clamped = Math.min(55, Math.max(17, age));
  return table[clamped] ?? 0;
}

// Education
const EDU_SINGLE: Record<EducationLevel, number> = {
  less_than_secondary: 0,
  secondary: 30,
  '1year': 90,
  '2year': 98,
  bachelors: 120,
  two_or_more: 128,
  masters: 135,
  phd: 150,
};

const EDU_MARRIED: Record<EducationLevel, number> = {
  less_than_secondary: 0,
  secondary: 28,
  '1year': 84,
  '2year': 91,
  bachelors: 112,
  two_or_more: 119,
  masters: 126,
  phd: 140,
};

// First official language points per CLB (single)
function firstLangPointsSingle(clb: number): number {
  if (clb >= 10) return 34;
  if (clb === 9)  return 31;
  if (clb === 8)  return 23;
  if (clb === 7)  return 17;
  if (clb === 6)  return 9;
  if (clb >= 4)   return 6;  // CLB 4 or 5
  return 0;
}

// First official language points per CLB (married)
function firstLangPointsMarried(clb: number): number {
  if (clb >= 10) return 32;
  if (clb === 9)  return 29;
  if (clb === 8)  return 22;
  if (clb === 7)  return 16;
  if (clb === 6)  return 8;
  if (clb >= 4)   return 6;  // CLB 4 or 5
  return 0;
}

// Second official language points per CLB
function secondLangPoints(clb: number): number {
  if (clb >= 9)  return 6;
  if (clb >= 7)  return 3;
  if (clb >= 5)  return 1;
  return 0;
}

// Canadian Work Experience (single)
const CWE_SINGLE: Record<number, number> = { 0: 0, 1: 40, 2: 53, 3: 64, 4: 72, 5: 80 };
const CWE_MARRIED: Record<number, number> = { 0: 0, 1: 35, 2: 46, 3: 56, 4: 63, 5: 70 };

// ─── Skill Transferability ────────────────────────────────────────────────────

function clampTo50(v: number): number { return Math.min(50, v); }

function skillTransferability(input: CRSInput, firstClb: LangScores): { total: number; eduPts: number; workPts: number } {
  const minClb = Math.min(firstClb.speaking, firstClb.listening, firstClb.reading, firstClb.writing);
  // IRCC transferability tiers (distinct from the core education grid):
  //   - "Post-secondary credential of one year or longer" (incl. a single
  //     bachelor's degree): 13 / 25
  //   - "Two or more credentials (one 3+ years)", master's/professional, or
  //     doctoral: 25 / 50
  const hasTopTierEdu = ['two_or_more', 'masters', 'phd'].includes(input.education);
  const hasPostSec = input.education !== 'less_than_secondary' && input.education !== 'secondary';
  const cwe = input.canadianWorkExp;
  const fwe = input.foreignWorkExp;

  // 1. Education + first language
  let eduLang = 0;
  if (hasPostSec) {
    if (hasTopTierEdu) {
      if (minClb >= 9)  eduLang = 50;
      else if (minClb >= 7) eduLang = 25;
    } else {
      if (minClb >= 9)  eduLang = 25;
      else if (minClb >= 7) eduLang = 13;
    }
  }

  // 2. Education + Canadian work experience
  let eduCWE = 0;
  if (hasPostSec && cwe >= 1) {
    if (hasTopTierEdu) {
      eduCWE = cwe >= 2 ? 50 : 25;
    } else {
      eduCWE = cwe >= 2 ? 25 : 13;
    }
  }

  const eduPts = Math.min(50, clampTo50(eduLang) + clampTo50(eduCWE));

  // 3. Foreign work experience + first language
  let fweLang = 0;
  if (fwe >= 1 && minClb >= 7) {
    const highFwe = fwe >= 3;
    const highLang = minClb >= 9;
    if (highFwe && highLang)  fweLang = 50;
    else if (highFwe)         fweLang = 25;
    else if (highLang)        fweLang = 25;
    else                      fweLang = 13;
  }

  // 4. Foreign work experience + Canadian work experience
  let fweCWE = 0;
  if (fwe >= 1 && cwe >= 1) {
    if (fwe >= 3 && cwe >= 2)  fweCWE = 50;
    else if (fwe >= 3)         fweCWE = 25;
    else if (cwe >= 2)         fweCWE = 25;
    else                       fweCWE = 13;
  }

  // 5. Trade cert + language
  let tradePts = 0;
  if (input.hasTradeCert) {
    if (minClb >= 7)       tradePts = 50;
    else if (minClb >= 5)  tradePts = 25;
  }

  // IRCC: education, foreign work, and trade cert are three separate 50-pt buckets (max 100 total)
  const foreignPts = Math.min(50, clampTo50(fweLang) + clampTo50(fweCWE));
  const tradePtsCapped = Math.min(50, tradePts);
  const workPts = foreignPts + tradePtsCapped;

  return { total: Math.min(100, eduPts + foreignPts + tradePtsCapped), eduPts, workPts };
}

// ─── Spouse Points ────────────────────────────────────────────────────────────

const SPOUSE_EDU: Record<EducationLevel, number> = {
  less_than_secondary: 0,
  secondary: 2,
  '1year': 6,
  '2year': 7,
  bachelors: 8,
  two_or_more: 9,
  masters: 10,
  phd: 10,
};

const SPOUSE_CWE: Record<number, number> = { 0: 0, 1: 5, 2: 7, 3: 8, 4: 9, 5: 10 };

function spouseLangPointsPer(clb: number): number {
  if (clb >= 9)  return 5;
  if (clb >= 7)  return 3;
  if (clb >= 5)  return 1;
  return 0;
}

// ─── Additional Points ────────────────────────────────────────────────────────

function additionalPoints(input: CRSInput, firstClb: LangScores, tefScale: TefScale = 'current'): number {
  let pts = 0;

  if (input.hasProvincialNomination) return 600; // dominates

  // Job offer points removed by IRCC effective March 25, 2025
  // if (input.jobOffer === 'noc_00') pts += 200;
  // else if (input.jobOffer === 'other') pts += 50;

  if (input.canadianEducation === '3year_plus') pts += 30;
  else if (input.canadianEducation === '1_2year') pts += 15;

  if (input.hasSiblingInCanada) pts += 15;

  // French ability bonus — only applies when candidate took a French test (TEF/TCF)
  let frenchClb: LangScores | null = null;
  if (input.firstLangTest === 'TEF' || input.firstLangTest === 'TCF') {
    frenchClb = firstClb;
  } else if (input.hasSecondLang && (input.secondLangTest === 'TEF' || input.secondLangTest === 'TCF')) {
    frenchClb = scoresToCLB(input.secondLangTest, input.secondLang, tefScale);
  }
  if (frenchClb) {
    const minFrench = Math.min(frenchClb.speaking, frenchClb.listening, frenchClb.reading, frenchClb.writing);
    if (minFrench >= 7) {
      // IRCC (2025-08-21): 50 pts when French NCLC 7+ and English below CLB 5 or no English test
      //                     25 pts when French NCLC 7+ and English CLB 5+ on all four skills
      let englishMinClb = 0;
      if (input.firstLangTest === 'TEF' || input.firstLangTest === 'TCF') {
        // French is first language; English is second (if provided and not another French test)
        if (input.hasSecondLang && input.secondLangTest !== 'TEF' && input.secondLangTest !== 'TCF') {
          const englishClb = scoresToCLB(input.secondLangTest, input.secondLang, tefScale);
          englishMinClb = Math.min(englishClb.speaking, englishClb.listening, englishClb.reading, englishClb.writing);
        }
      } else {
        // English is first language; French is second — English CLB comes from firstClb
        englishMinClb = Math.min(firstClb.speaking, firstClb.listening, firstClb.reading, firstClb.writing);
      }
      pts += englishMinClb >= 5 ? 25 : 50;
    }
  }

  return Math.min(600, pts);
}

// ─── Main Calculator ──────────────────────────────────────────────────────────

export function calculateCRS(input: CRSInput): CRSBreakdown {
  const married = input.maritalStatus === 'married';
  const tefScale = input.tefScale ?? 'current';
  const firstClb = scoresToCLB(input.firstLangTest, input.firstLang, tefScale);
  const secondClb = input.hasSecondLang
    ? scoresToCLB(input.secondLangTest, input.secondLang, tefScale)
    : { speaking: 0, listening: 0, reading: 0, writing: 0 };

  // ── A: Core / Human Capital ──
  const agePoints_   = agePoints(input.age, married);
  const eduPoints_   = married ? EDU_MARRIED[input.education] : EDU_SINGLE[input.education];
  const fn1 = married ? firstLangPointsMarried : firstLangPointsSingle;
  const firstLangPts =
    fn1(firstClb.speaking) + fn1(firstClb.listening) +
    fn1(firstClb.reading)  + fn1(firstClb.writing);
  const secondLangPts =
    secondLangPoints(secondClb.speaking) + secondLangPoints(secondClb.listening) +
    secondLangPoints(secondClb.reading)  + secondLangPoints(secondClb.writing);
  const cweTable = married ? CWE_MARRIED : CWE_SINGLE;
  const cwePts   = cweTable[input.canadianWorkExp] ?? 0;

  // Second official language subtotal caps: 24 single, 22 with spouse (IRCC grid)
  const secondLangCap    = married ? 22 : 24;
  const secondLangCapped = Math.min(secondLangCap, secondLangPts);

  const coreTotal = agePoints_ + eduPoints_ + firstLangPts + secondLangCapped + cwePts;

  // ── Spouse / common-law factors ──
  let spouseEduPts = 0, spouseLangPts = 0, spouseCWEPts = 0;
  if (married) {
    spouseEduPts  = SPOUSE_EDU[input.spouseEducation] ?? 0;
    spouseLangPts = (
      spouseLangPointsPer(input.spouseLang.speaking) +
      spouseLangPointsPer(input.spouseLang.listening) +
      spouseLangPointsPer(input.spouseLang.reading)  +
      spouseLangPointsPer(input.spouseLang.writing)
    );
    spouseCWEPts  = SPOUSE_CWE[input.spouseCanadianWorkExp] ?? 0;
  }
  const spouseTotal = spouseEduPts + spouseLangPts + spouseCWEPts;

  // ── B: Skill Transferability ──
  const skillBreakdown = skillTransferability(input, firstClb);
  const skillPts = skillBreakdown.total;

  // ── C: Additional ──
  const addPts = additionalPoints(input, firstClb, tefScale);

  const total = Math.min(1200, coreTotal + spouseTotal + skillPts + addPts);

  return {
    agePoints: agePoints_,
    educationPoints: eduPoints_,
    firstLangPoints: firstLangPts,
    secondLangPoints: secondLangCapped,
    canadianWorkExpPoints: cwePts,
    coreTotal,
    spouseEducationPoints: spouseEduPts,
    spouseLangPoints: spouseLangPts,
    spouseWorkExpPoints: spouseCWEPts,
    spouseTotal,
    skillTransferPoints: skillPts,
    eduTransferPoints: skillBreakdown.eduPts,
    workTransferPoints: skillBreakdown.workPts,
    additionalPoints: addPts,
    total,
    firstLangClb: firstClb,
  };
}

// ─── Category Suggestion ──────────────────────────────────────────────────────

export function suggestCategory(input: CRSInput, firstClb: LangScores): string {
  const minClb = Math.min(firstClb.speaking, firstClb.listening, firstClb.reading, firstClb.writing);

  // Provincial Nominee Program — 600 pt boost, near-guaranteed
  if (input.hasProvincialNomination) return 'PNP';

  // French-language proficiency stream
  const isFrenchTest = input.firstLangTest === 'TEF' || input.firstLangTest === 'TCF';
  if (isFrenchTest && minClb >= 7) return 'French';

  // Canadian Experience Class — 1+ yr Canadian work experience
  if (input.canadianWorkExp >= 1) return 'CEC';

  // Federal Skilled Trades — trade certificate + language (CLB 5+)
  if (input.hasTradeCert && minClb >= 5) return 'FST';

  // Federal Skilled Worker — foreign work experience or strong profile
  return 'FSW';
}
