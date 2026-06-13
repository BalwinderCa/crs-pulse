import { calculateSinp, SINP_PASS_MARK, type SinpInput } from '../../src/features/sinp/utils/sinpCalculator';

const BASE: SinpInput = {
  education: 'bachelors',
  age: '22_34',
  language: 'clb8plus',
  secondLanguage: 'clb5',
  workRecentYears: 3,
  workEarlierYears: 0,
  hasSaskJobOffer: true,
  hasSaskFamily: false,
  hasSaskWorkExp: false,
  hasSaskStudy: false,
};

describe('calculateSinp', () => {
  it('computes a passing profile', () => {
    const r = calculateSinp(BASE);
    expect(r.education).toBe(20);
    expect(r.age).toBe(12);
    expect(r.language).toBe(24); // 20 + 4 second language
    expect(r.workExperience).toBe(6); // recent 3yr * 2
    expect(r.connection).toBe(30); // job offer
    expect(r.total).toBe(92);
    expect(r.pass).toBe(true);
  });

  it('recent work = 2pts/yr capped at 5yr; earlier work skips first year', () => {
    expect(calculateSinp({ ...BASE, workRecentYears: 6, workEarlierYears: 0 }).workExperience).toBe(10);
    expect(calculateSinp({ ...BASE, workRecentYears: 0, workEarlierYears: 1 }).workExperience).toBe(0);
    expect(calculateSinp({ ...BASE, workRecentYears: 0, workEarlierYears: 5 }).workExperience).toBe(5);
  });

  it('caps connection points at 30', () => {
    const r = calculateSinp({
      ...BASE,
      hasSaskJobOffer: true,
      hasSaskFamily: true,
      hasSaskWorkExp: true,
      hasSaskStudy: true,
    });
    expect(r.connection).toBe(30);
  });

  it('fails below the 60-point pool mark', () => {
    const r = calculateSinp({
      ...BASE,
      education: 'none',
      age: 'over50',
      language: 'below4',
      secondLanguage: 'below4',
      workRecentYears: 0,
      hasSaskJobOffer: false,
    });
    expect(r.total).toBeLessThan(SINP_PASS_MARK);
    expect(r.pass).toBe(false);
  });
});
