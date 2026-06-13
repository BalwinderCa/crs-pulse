import { calculateSirs, sirsWagePoints, type SirsInput } from '../../src/features/bcpnp/utils/sirsCalculator';

const BASE: SirsInput = {
  workYears: '5plus',
  hasCanadianExp: true,
  currentlyWorkingInJob: true,
  education: 'bachelors',
  educationLocation: 'bc',
  hasTradesOrProfessionalCert: true,
  language: 'clb9plus',
  bothOfficialLanguages: true,
  hourlyWage: 70,
  region: 'area3',
  hasRegionalExperience: true,
};

describe('sirsWagePoints', () => {
  it('is 0 below $16/hr, $1 per dollar above $15, capped at 55', () => {
    expect(sirsWagePoints(15)).toBe(0);
    expect(sirsWagePoints(16)).toBe(1);
    expect(sirsWagePoints(20)).toBe(5);
    expect(sirsWagePoints(70)).toBe(55);
    expect(sirsWagePoints(200)).toBe(55);
    expect(sirsWagePoints(Number.NaN)).toBe(0);
  });
});

describe('calculateSirs', () => {
  it('computes a top profile with section caps applied', () => {
    const r = calculateSirs(BASE);
    expect(r.workExperience).toBe(40); // 20 + 10 + 10, capped 40
    expect(r.education).toBe(28); // 15 + 8 + 5
    expect(r.language).toBe(40); // 30 + 10
    expect(r.wage).toBe(55);
    expect(r.region).toBe(25); // 15 + 10, capped 25
    expect(r.total).toBe(188);
  });

  it('floors at zero for a minimal profile', () => {
    const r = calculateSirs({
      workYears: 'none',
      hasCanadianExp: false,
      currentlyWorkingInJob: false,
      education: 'secondary',
      educationLocation: 'outside',
      hasTradesOrProfessionalCert: false,
      language: 'below4',
      bothOfficialLanguages: false,
      hourlyWage: 0,
      region: 'metro_vancouver',
      hasRegionalExperience: false,
    });
    expect(r.total).toBe(0);
  });
});
