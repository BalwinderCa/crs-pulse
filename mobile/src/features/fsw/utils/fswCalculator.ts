/**
 * Federal Skilled Worker — six selection factors (67-point grid)
 * Source: IRCC, canada.ca → Six selection factors – FSW Program
 *
 * Maximum 100 points; minimum 67 required to be eligible.
 * Estimate only — verify with the official IRCC tool.
 */

export type FswClb = 'clb9plus' | 'clb8' | 'clb7' | 'below7';

export type FswEducation =
  | 'phd'
  | 'masters_professional'
  | 'two_or_more'
  | 'bachelors_3yr'
  | 'diploma_2yr'
  | 'diploma_1yr'
  | 'secondary';

export type FswWorkYears = 'none' | '1' | '2_3' | '4_5' | '6plus';

export interface FswInput {
  age: number;
  education: FswEducation;
  firstLang: { speaking: FswClb; listening: FswClb; reading: FswClb; writing: FswClb };
  /** CLB 5+ in ALL four abilities of the other official language. */
  secondLangClb5: boolean;
  workYears: FswWorkYears;
  hasArrangedEmployment: boolean;
  // Adaptability
  spouseLangClb4: boolean;
  studiedInCanada: boolean;
  spouseStudiedInCanada: boolean;
  workedInCanada: boolean;
  spouseWorkedInCanada: boolean;
  hasRelativeInCanada: boolean;
}

export interface FswBreakdown {
  language: number;
  education: number;
  workExperience: number;
  age: number;
  arrangedEmployment: number;
  adaptability: number;
  total: number;
  pass: boolean;
  /** CLB 7 in all four first-language abilities — hard eligibility requirement. */
  meetsLanguageMinimum: boolean;
  /** At least 1 year of continuous skilled work — hard eligibility requirement. */
  meetsWorkMinimum: boolean;
}

export const FSW_PASS_MARK = 67;
export const FSW_MAX_SCORE = 100;

// First official language: per ability
const FIRST_LANG_POINTS: Record<FswClb, number> = {
  clb9plus: 6,
  clb8:     5,
  clb7:     4,
  below7:   0,
};

const EDUCATION_POINTS: Record<FswEducation, number> = {
  phd:                  25,
  masters_professional: 23,
  two_or_more:          22,
  bachelors_3yr:        21,
  diploma_2yr:          19,
  diploma_1yr:          15,
  secondary:            5,
};

const WORK_POINTS: Record<FswWorkYears, number> = {
  none:    0,
  '1':     9,
  '2_3':   11,
  '4_5':   13,
  '6plus': 15,
};

// 18–35 = 12, then −1 per year from 36; 0 at 47+ and under 18
export function fswAgePoints(age: number): number {
  if (age < 18 || age >= 47) return 0;
  if (age <= 35) return 12;
  return Math.max(0, 12 - (age - 35));
}

export function calculateFsw(input: FswInput): FswBreakdown {
  const abilities = Object.values(input.firstLang);
  const meetsLanguageMinimum = abilities.every((a) => a !== 'below7');

  const firstLangPoints = abilities.reduce((sum, a) => sum + FIRST_LANG_POINTS[a], 0);
  const language = Math.min(28, firstLangPoints + (input.secondLangClb5 ? 4 : 0));

  const education = EDUCATION_POINTS[input.education];
  const workExperience = WORK_POINTS[input.workYears];
  const meetsWorkMinimum = input.workYears !== 'none';
  const age = fswAgePoints(input.age);
  const arrangedEmployment = input.hasArrangedEmployment ? 10 : 0;

  const adaptability = Math.min(
    10,
    (input.spouseLangClb4 ? 5 : 0) +
      (input.studiedInCanada ? 5 : 0) +
      (input.spouseStudiedInCanada ? 5 : 0) +
      (input.workedInCanada ? 10 : 0) +
      (input.spouseWorkedInCanada ? 5 : 0) +
      (input.hasArrangedEmployment ? 5 : 0) +
      (input.hasRelativeInCanada ? 5 : 0),
  );

  const total = language + education + workExperience + age + arrangedEmployment + adaptability;

  return {
    language,
    education,
    workExperience,
    age,
    arrangedEmployment,
    adaptability,
    total,
    pass: total >= FSW_PASS_MARK && meetsLanguageMinimum && meetsWorkMinimum,
    meetsLanguageMinimum,
    meetsWorkMinimum,
  };
}
