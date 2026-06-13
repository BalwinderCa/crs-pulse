/**
 * BC PNP — Skills Immigration Registration System (SIRS)
 * Source: WelcomeBC SIRS scoring criteria (skills immigration streams).
 *
 * Maximum 200 points: human capital (work experience, education,
 * language — max 120) + economic factors (wage, region — max 80).
 * No fixed pass mark — candidates compete in periodic draws.
 * Estimate only — verify with the official BC PNP program guide.
 */

export type SirsWorkYears = 'none' | '1_2' | '2_3' | '3_4' | '4_5' | '5plus';

export type SirsEducation =
  | 'doctorate'
  | 'masters'
  | 'postgrad_cert'
  | 'bachelors'
  | 'associate'
  | 'diploma_cert'
  | 'secondary';

export type SirsEducationLocation = 'bc' | 'canada' | 'outside';

export type SirsClb = 'clb9plus' | 'clb8' | 'clb7' | 'clb6' | 'clb5' | 'clb4' | 'below4';

export type SirsRegion = 'metro_vancouver' | 'area2' | 'area3';

export interface SirsInput {
  workYears: SirsWorkYears;
  hasCanadianExp: boolean;
  currentlyWorkingInJob: boolean;
  education: SirsEducation;
  educationLocation: SirsEducationLocation;
  hasTradesOrProfessionalCert: boolean;
  language: SirsClb;
  bothOfficialLanguages: boolean;
  hourlyWage: number;
  region: SirsRegion;
  hasRegionalExperience: boolean;
}

export interface SirsBreakdown {
  workExperience: number;
  education: number;
  language: number;
  wage: number;
  region: number;
  total: number;
}

export const SIRS_MAX_SCORE = 200;

const WORK_POINTS: Record<SirsWorkYears, number> = {
  none:   0,
  '1_2':  4,
  '2_3':  8,
  '3_4':  12,
  '4_5':  16,
  '5plus': 20,
};

const EDUCATION_POINTS: Record<SirsEducation, number> = {
  doctorate:     27,
  masters:       22,
  postgrad_cert: 15,
  bachelors:     15,
  associate:     5,
  diploma_cert:  5,
  secondary:     0,
};

const EDUCATION_LOCATION_POINTS: Record<SirsEducationLocation, number> = {
  bc:      8,
  canada:  6,
  outside: 0,
};

const LANGUAGE_POINTS: Record<SirsClb, number> = {
  clb9plus: 30,
  clb8:     25,
  clb7:     20,
  clb6:     15,
  clb5:     10,
  clb4:     5,
  below4:   0,
};

const REGION_POINTS: Record<SirsRegion, number> = {
  metro_vancouver: 0,
  area2:           5,  // Squamish, Abbotsford, Agassiz, Mission, Chilliwack
  area3:           15, // everywhere else in B.C.
};

/** $16.00/hr = 1 point, +1 per dollar, capped at 55 ($70+/hr). */
export function sirsWagePoints(hourlyWage: number): number {
  if (!Number.isFinite(hourlyWage) || hourlyWage < 16) return 0;
  return Math.min(55, Math.floor(hourlyWage) - 15);
}

export function calculateSirs(input: SirsInput): SirsBreakdown {
  const workExperience = Math.min(
    40,
    WORK_POINTS[input.workYears] +
      (input.hasCanadianExp ? 10 : 0) +
      (input.currentlyWorkingInJob ? 10 : 0),
  );

  const education = Math.min(
    40,
    EDUCATION_POINTS[input.education] +
      EDUCATION_LOCATION_POINTS[input.educationLocation] +
      (input.hasTradesOrProfessionalCert ? 5 : 0),
  );

  const language = Math.min(
    40,
    LANGUAGE_POINTS[input.language] + (input.bothOfficialLanguages ? 10 : 0),
  );

  const wage = sirsWagePoints(input.hourlyWage);

  const region = Math.min(
    25,
    REGION_POINTS[input.region] + (input.hasRegionalExperience ? 10 : 0),
  );

  return {
    workExperience,
    education,
    language,
    wage,
    region,
    total: workExperience + education + language + wage + region,
  };
}
