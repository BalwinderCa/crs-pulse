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

// TEF → CLB (speaking/listening/reading/writing)
function tefToCLB(skill: keyof LangScores, score: number): number {
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
    if (score >= 270) return 4;
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

export function toCLB(test: LanguageTest, skill: keyof LangScores, score: number): number {
  if (test === 'CELPIP' || test === 'CLB') return Math.min(12, Math.max(0, Math.round(score)));
  if (test === 'IELTS')    return ieltsToCLB(skill, score);
  if (test === 'PTE_CORE') return pteCoreToCLB(skill, score);
  if (test === 'TEF')      return tefToCLB(skill, score);
  if (test === 'TCF')      return tcfToCLB(skill, score);
  return 0;
}

export function scoresToCLB(test: LanguageTest, scores: LangScores): LangScores {
  return {
    speaking:  toCLB(test, 'speaking',  scores.speaking),
    listening: toCLB(test, 'listening', scores.listening),
    reading:   toCLB(test, 'reading',   scores.reading),
    writing:   toCLB(test, 'writing',   scores.writing),
  };
}

// ─── CLB Snap Breakpoints ─────────────────────────────────────────────────────
// Returns sorted array of raw scores that are the minimum for each CLB band.
// These are used as slider snap-points (tick marks on the track).
// First element = lowest possible score for that test/skill (represents "below CLB 4").

type TestRange = { min: number; max: number; step: number };

const TEST_RANGES: Record<LanguageTest, TestRange> = {
  IELTS:    { min: 0,   max: 9,   step: 0.5 },
  CELPIP:   { min: 1,   max: 12,  step: 1   },
  CLB:      { min: 0,   max: 12,  step: 1   },
  PTE_CORE: { min: 10,  max: 90,  step: 1   },
  TEF:      { min: 0,   max: 450, step: 1   },
  TCF:      { min: 0,   max: 699, step: 1   },
};

export function getClbBreakpoints(test: LanguageTest, skill: keyof LangScores): number[] {
  const { min, max, step } = TEST_RANGES[test];
  const breaks: number[] = [min]; // first snap = test minimum (below CLB 4)
  let prevClb = toCLB(test, skill, min);

  for (let s = min + step; s <= max + 0.001; s += step) {
    const sc = parseFloat(s.toFixed(2));
    const clb = toCLB(test, skill, sc);
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
): [number, number] {
  const breaks = getClbBreakpoints(test, skill);
  const { max } = TEST_RANGES[test];
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
const AGE_POINTS_SINGLE: Record<number, number> = {
  17: 0, 18: 99, 19: 105, 20: 110, 21: 110, 22: 110, 23: 110, 24: 110,
  25: 110, 26: 110, 27: 110, 28: 110, 29: 110, 30: 110, 31: 110, 32: 110,
  33: 110, 34: 110, 35: 110, 36: 105, 37: 99, 38: 94, 39: 88, 40: 83,
  41: 77, 42: 72, 43: 66, 44: 61, 45: 55, 46: 50, 47: 44, 48: 39,
  49: 33, 50: 28, 51: 22, 52: 17, 53: 11, 54: 6, 55: 0,
};

const AGE_POINTS_MARRIED: Record<number, number> = {
  17: 0, 18: 90, 19: 95, 20: 100, 21: 100, 22: 100, 23: 100, 24: 100,
  25: 100, 26: 100, 27: 100, 28: 100, 29: 100, 30: 100, 31: 100, 32: 100,
  33: 100, 34: 100, 35: 100, 36: 95, 37: 90, 38: 85, 39: 80, 40: 75,
  41: 70, 42: 65, 43: 60, 44: 55, 45: 50, 46: 45, 47: 40, 48: 35,
  49: 30, 50: 25, 51: 20, 52: 15, 53: 10, 54: 5, 55: 0,
};

function agePoints(age: number, married: boolean): number {
  const table = married ? AGE_POINTS_MARRIED : AGE_POINTS_SINGLE;
  const clamped = Math.min(55, Math.max(17, age));
  return table[clamped] ?? 0;
}

// Education
const EDU_SINGLE: Record<EducationLevel, number> = {
  less_than_secondary: 0,
  secondary: 28,
  '1year': 84,
  '2year': 91,
  bachelors: 112,
  two_or_more: 128, // verified: IRCC gives 128 for two_or_more (single, no spouse)
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
  if (clb === 7)  return 16;
  if (clb === 6)  return 8;
  if (clb === 5)  return 6;
  return 0;
}

// First official language points per CLB (married)
function firstLangPointsMarried(clb: number): number {
  if (clb >= 10) return 32;
  if (clb === 9)  return 29;
  if (clb === 8)  return 22;
  if (clb === 7)  return 16;
  if (clb === 6)  return 8;
  if (clb === 5)  return 6;
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
  const hasDegree = ['bachelors', 'two_or_more', 'masters', 'phd'].includes(input.education);
  const hasPostSec = input.education !== 'less_than_secondary' && input.education !== 'secondary';
  const cwe = input.canadianWorkExp;
  const fwe = input.foreignWorkExp;

  // 1. Education + first language
  let eduLang = 0;
  if (hasPostSec) {
    if (hasDegree) {
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
    if (hasDegree) {
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

  const workPts = Math.min(50, clampTo50(fweLang) + clampTo50(fweCWE) + tradePts);

  return { total: Math.min(100, eduPts + workPts), eduPts, workPts };
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

function additionalPoints(input: CRSInput, firstClb: LangScores): number {
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
    frenchClb = scoresToCLB(input.secondLangTest, input.secondLang);
  }
  if (frenchClb) {
    const minFrench = Math.min(frenchClb.speaking, frenchClb.listening, frenchClb.reading, frenchClb.writing);
    if (minFrench >= 7) {
      // IRCC: 50 pts when French CLB 7+ and English below CLB 5 (unilingual Francophone)
      //       25 pts when French CLB 7+ and English CLB 5+
      let englishMinClb = 0;
      if (input.firstLangTest === 'TEF' || input.firstLangTest === 'TCF') {
        // French is first language; English is second (if provided and not another French test)
        if (input.hasSecondLang && input.secondLangTest !== 'TEF' && input.secondLangTest !== 'TCF') {
          const englishClb = scoresToCLB(input.secondLangTest, input.secondLang);
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
  const firstClb = scoresToCLB(input.firstLangTest, input.firstLang);
  const secondClb = input.hasSecondLang
    ? scoresToCLB(input.secondLangTest, input.secondLang)
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

  const coreTotal = agePoints_ + eduPoints_ + firstLangPts + Math.min(24, secondLangPts) + cwePts;

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
  const addPts = additionalPoints(input, firstClb);

  const total = Math.min(1200, coreTotal + spouseTotal + skillPts + addPts);

  return {
    agePoints: agePoints_,
    educationPoints: eduPoints_,
    firstLangPoints: firstLangPts,
    secondLangPoints: Math.min(24, secondLangPts),
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
