/**
 * SINP International Skilled Worker — Points Assessment Grid
 * Source: saskatchewan.ca (Expression of Interest points grid)
 *
 * Maximum 110 points; minimum 60 required to qualify for the EOI pool.
 * This is an estimate for planning purposes — applicants must verify
 * against the official SINP point assessment.
 */

export type SinpEducation =
  | 'masters_phd'
  | 'bachelors'
  | 'trade_cert'
  | 'diploma_2yr'
  | 'diploma_1yr'
  | 'none';

export type SinpAgeBand = 'under18' | '18_21' | '22_34' | '35_45' | '46_50' | 'over50';

export type SinpClb = 'clb8plus' | 'clb7' | 'clb6' | 'clb5' | 'clb4' | 'below4';

export interface SinpInput {
  education: SinpEducation;
  age: SinpAgeBand;
  language: SinpClb;
  /** Second official language (English or French), 'below4' when none. */
  secondLanguage: SinpClb;
  /** Years worked in field of education, within 5 years before applying (0–5). */
  workRecentYears: number;
  /** Years worked in field of education, 6–10 years before applying (0–5). */
  workEarlierYears: number;
  hasSaskJobOffer: boolean;
  hasSaskFamily: boolean;
  hasSaskWorkExp: boolean;
  hasSaskStudy: boolean;
}

export interface SinpBreakdown {
  education: number;
  workExperience: number;
  language: number;
  age: number;
  connection: number;
  total: number;
  pass: boolean;
}

export const SINP_MAX_SCORE = 110;
export const SINP_PASS_MARK = 60;

const EDUCATION_POINTS: Record<SinpEducation, number> = {
  masters_phd: 23,
  bachelors:   20,
  trade_cert:  20,
  diploma_2yr: 15,
  diploma_1yr: 12,
  none:        0,
};

const AGE_POINTS: Record<SinpAgeBand, number> = {
  under18: 0,
  '18_21': 8,
  '22_34': 12,
  '35_45': 10,
  '46_50': 8,
  over50:  0,
};

// First language: max 20
const LANGUAGE_POINTS: Record<SinpClb, number> = {
  clb8plus: 20,
  clb7:     18,
  clb6:     16,
  clb5:     14,
  clb4:     12,
  below4:   0,
};

// Second official language: max 10
const SECOND_LANGUAGE_POINTS: Record<SinpClb, number> = {
  clb8plus: 10,
  clb7:     8,
  clb6:     6,
  clb5:     4,
  clb4:     2,
  below4:   0,
};

// Recent window (1–5 years before applying): 2 points per year, max 10
function recentWorkPoints(years: number): number {
  return Math.min(5, Math.max(0, Math.floor(years))) * 2;
}

// Earlier window (6–10 years before applying): 1 point per year from the
// second year onward (1 year = 0), max 5
function earlierWorkPoints(years: number): number {
  const y = Math.min(5, Math.max(0, Math.floor(years)));
  return y <= 1 ? 0 : y;
}

export function calculateSinp(input: SinpInput): SinpBreakdown {
  const education = EDUCATION_POINTS[input.education];
  const workExperience = recentWorkPoints(input.workRecentYears) + earlierWorkPoints(input.workEarlierYears);
  const language = LANGUAGE_POINTS[input.language] + SECOND_LANGUAGE_POINTS[input.secondLanguage];
  const age = AGE_POINTS[input.age];

  const connection = Math.min(
    30,
    (input.hasSaskJobOffer ? 30 : 0) +
      (input.hasSaskFamily ? 20 : 0) +
      (input.hasSaskWorkExp ? 5 : 0) +
      (input.hasSaskStudy ? 5 : 0),
  );

  const total = education + workExperience + language + age + connection;

  return {
    education,
    workExperience,
    language,
    age,
    connection,
    total,
    pass: total >= SINP_PASS_MARK,
  };
}
