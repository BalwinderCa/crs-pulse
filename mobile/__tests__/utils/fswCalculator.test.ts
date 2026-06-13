import {
  calculateFsw,
  fswAgePoints,
  FSW_PASS_MARK,
  type FswInput,
} from '../../src/features/fsw/utils/fswCalculator';

const BASE: FswInput = {
  age: 30,
  education: 'bachelors_3yr',
  firstLang: { speaking: 'clb9plus', listening: 'clb9plus', reading: 'clb9plus', writing: 'clb9plus' },
  secondLangClb5: true,
  workYears: '6plus',
  hasArrangedEmployment: false,
  spouseLangClb4: false,
  studiedInCanada: false,
  spouseStudiedInCanada: false,
  workedInCanada: false,
  spouseWorkedInCanada: false,
  hasRelativeInCanada: false,
};

describe('fswAgePoints', () => {
  it('awards full points 18–35, declines 1/yr to 0 at 47+', () => {
    expect(fswAgePoints(17)).toBe(0);
    expect(fswAgePoints(18)).toBe(12);
    expect(fswAgePoints(35)).toBe(12);
    expect(fswAgePoints(40)).toBe(7);
    expect(fswAgePoints(46)).toBe(1);
    expect(fswAgePoints(47)).toBe(0);
  });
});

describe('calculateFsw', () => {
  it('computes a strong passing profile', () => {
    const r = calculateFsw(BASE);
    expect(r.language).toBe(28); // 24 first-lang + 4 second, capped 28
    expect(r.education).toBe(21);
    expect(r.workExperience).toBe(15);
    expect(r.age).toBe(12);
    expect(r.total).toBe(76);
    expect(r.pass).toBe(true);
  });

  it('caps adaptability at 10', () => {
    const r = calculateFsw({ ...BASE, workedInCanada: true, hasRelativeInCanada: true });
    expect(r.adaptability).toBe(10);
  });

  it('fails when below the language minimum even with a high score', () => {
    const r = calculateFsw({
      ...BASE,
      firstLang: { speaking: 'below7', listening: 'clb9plus', reading: 'clb9plus', writing: 'clb9plus' },
    });
    expect(r.meetsLanguageMinimum).toBe(false);
    expect(r.pass).toBe(false);
  });

  it('fails when no skilled work experience', () => {
    const r = calculateFsw({ ...BASE, workYears: 'none' });
    expect(r.meetsWorkMinimum).toBe(false);
    expect(r.pass).toBe(false);
  });

  it('pass mark is 67', () => {
    expect(FSW_PASS_MARK).toBe(67);
  });
});
