import {
  toCLB,
  calculateCRS,
  type CRSInput,
  type LangScores,
} from '../../src/features/onboarding/utils/crsCalculator';

// ─── Base input for tests ─────────────────────────────────────────────────────

const BASE_INPUT: CRSInput = {
  maritalStatus: 'single',
  age: 30,
  education: 'bachelors',
  canadianEducation: 'none',
  firstLangTest: 'IELTS',
  firstLang: { speaking: 7.0, listening: 8.0, reading: 7.0, writing: 7.0 },
  hasSecondLang: false,
  secondLangTest: 'TEF',
  secondLang: { speaking: 0, listening: 0, reading: 0, writing: 0 },
  canadianWorkExp: 0,
  foreignWorkExp: 0,
  spouseEducation: 'secondary',
  spouseLang: { speaking: 0, listening: 0, reading: 0, writing: 0 },
  spouseCanadianWorkExp: 0,
  hasProvincialNomination: false,
  jobOffer: 'none',
  hasSiblingInCanada: false,
  hasTradeCert: false,
};

// ─── TCF Listening CLB mapping ────────────────────────────────────────────────

describe('TCF Listening CLB mapping', () => {
  it('returns CLB 0 for score 269 (below CLB 4 threshold)', () => {
    expect(toCLB('TCF', 'listening', 269)).toBe(0);
  });

  it('returns CLB 4 for score 270 (CLB 4 lower boundary)', () => {
    expect(toCLB('TCF', 'listening', 270)).toBe(4);
  });

  it('returns CLB 4 for score 368 (CLB 4 upper boundary)', () => {
    expect(toCLB('TCF', 'listening', 368)).toBe(4);
  });

  it('returns CLB 5 for score 369 (CLB 5 lower boundary)', () => {
    expect(toCLB('TCF', 'listening', 369)).toBe(5);
  });

  it('returns CLB 5 for score 397 (CLB 5 upper boundary)', () => {
    expect(toCLB('TCF', 'listening', 397)).toBe(5);
  });

  it('returns CLB 6 for score 398 (CLB 6 lower boundary)', () => {
    expect(toCLB('TCF', 'listening', 398)).toBe(6);
  });

  it('returns CLB 7 for score 458', () => {
    expect(toCLB('TCF', 'listening', 458)).toBe(7);
  });

  it('returns CLB 8 for score 503', () => {
    expect(toCLB('TCF', 'listening', 503)).toBe(8);
  });

  it('returns CLB 9 for score 523', () => {
    expect(toCLB('TCF', 'listening', 523)).toBe(9);
  });

  it('returns CLB 10 for score 549', () => {
    expect(toCLB('TCF', 'listening', 549)).toBe(10);
  });
});

// ─── French bonus additional points ──────────────────────────────────────────

describe('French language bonus (IRCC additional points)', () => {
  it('awards 50 pts when French CLB 7+ and no English score (unilingual Francophone)', () => {
    const input: CRSInput = {
      ...BASE_INPUT,
      firstLangTest: 'TCF',
      // All TCF skills >= CLB 7: speaking 10, listening 458, reading 453, writing 10
      firstLang: { speaking: 10, listening: 458, reading: 453, writing: 10 },
      hasSecondLang: false,
    };

    const result = calculateCRS(input);
    expect(result.additionalPoints).toBe(50);
  });

  it('awards 50 pts when French CLB 7+ and English below CLB 5', () => {
    // French first lang (TCF), English second lang below CLB 5
    // IELTS speaking 4.0 = CLB 4, listening 4.5 = CLB 4, reading 3.5 = CLB 4, writing 4.0 = CLB 4
    const input: CRSInput = {
      ...BASE_INPUT,
      firstLangTest: 'TCF',
      firstLang: { speaking: 10, listening: 458, reading: 453, writing: 10 },
      hasSecondLang: true,
      secondLangTest: 'IELTS',
      secondLang: { speaking: 4.0, listening: 4.5, reading: 3.5, writing: 4.0 },
    };

    const result = calculateCRS(input);
    expect(result.additionalPoints).toBe(50);
  });

  it('awards 25 pts when French CLB 7+ and English CLB 5+', () => {
    // French first lang (TCF), English second lang at CLB 5+
    // IELTS speaking 5.0 = CLB 5, listening 5.0 = CLB 5, reading 4.0 = CLB 5, writing 5.0 = CLB 5
    const input: CRSInput = {
      ...BASE_INPUT,
      firstLangTest: 'TCF',
      firstLang: { speaking: 10, listening: 458, reading: 453, writing: 10 },
      hasSecondLang: true,
      secondLangTest: 'IELTS',
      secondLang: { speaking: 5.0, listening: 5.0, reading: 4.0, writing: 5.0 },
    };

    const result = calculateCRS(input);
    expect(result.additionalPoints).toBe(25);
  });

  it('awards 25 pts when English first and French second with English CLB 7+', () => {
    // English first (IELTS CLB 9+), French second (TEF CLB 7+)
    const input: CRSInput = {
      ...BASE_INPUT,
      firstLangTest: 'IELTS',
      firstLang: { speaking: 7.5, listening: 8.5, reading: 8.0, writing: 7.5 }, // all CLB 9+
      hasSecondLang: true,
      secondLangTest: 'TEF',
      // TEF speaking 310 = CLB 7, listening 249 = CLB 7, reading 207 = CLB 7, writing 310 = CLB 7
      secondLang: { speaking: 310, listening: 249, reading: 207, writing: 310 },
    };

    const result = calculateCRS(input);
    expect(result.additionalPoints).toBe(25);
  });

  it('awards 50 pts when English first at CLB 4 and French second CLB 7+', () => {
    // English first (IELTS CLB 4), French second (TEF CLB 7+)
    const input: CRSInput = {
      ...BASE_INPUT,
      firstLangTest: 'IELTS',
      firstLang: { speaking: 4.0, listening: 4.5, reading: 3.5, writing: 4.0 }, // all CLB 4
      hasSecondLang: true,
      secondLangTest: 'TEF',
      secondLang: { speaking: 310, listening: 249, reading: 207, writing: 310 }, // CLB 7
    };

    const result = calculateCRS(input);
    expect(result.additionalPoints).toBe(50);
  });

  it('awards 0 pts when French CLB below 7', () => {
    const input: CRSInput = {
      ...BASE_INPUT,
      firstLangTest: 'TCF',
      // TCF speaking 4 = CLB 4, below CLB 7
      firstLang: { speaking: 4, listening: 270, reading: 342, writing: 4 },
      hasSecondLang: false,
    };

    const result = calculateCRS(input);
    expect(result.additionalPoints).toBe(0);
  });
});

// ─── Skill transferability — two_or_more education ───────────────────────────

describe('Skill transferability with two_or_more education', () => {
  it('two_or_more + CLB 7 language earns top-tier edu+lang points (25 pts)', () => {
    // Per IRCC grid, "two or more post-secondary credentials (one 3+ years)"
    // sits in the same transferability row as a bachelor's degree: 25 / 50.
    const input: CRSInput = {
      ...BASE_INPUT,
      education: 'two_or_more',
      firstLang: { speaking: 6.0, listening: 6.0, reading: 6.0, writing: 6.0 }, // all CLB 7
    };

    const result = calculateCRS(input);
    expect(result.eduTransferPoints).toBe(25);
  });

  it('two_or_more + CLB 9 language earns maximum edu+lang points (50 pts)', () => {
    const input: CRSInput = {
      ...BASE_INPUT,
      education: 'two_or_more',
      firstLang: { speaking: 7.5, listening: 8.5, reading: 8.0, writing: 7.5 }, // CLB 9+
    };

    const result = calculateCRS(input);
    expect(result.eduTransferPoints).toBe(50);
  });

  it('bachelors and two_or_more earn the same skill transfer edu points', () => {
    const bachelorsInput: CRSInput = {
      ...BASE_INPUT,
      education: 'bachelors',
      firstLang: { speaking: 7.5, listening: 8.5, reading: 8.0, writing: 7.5 },
    };
    const twoOrMoreInput: CRSInput = {
      ...BASE_INPUT,
      education: 'two_or_more',
      firstLang: { speaking: 7.5, listening: 8.5, reading: 8.0, writing: 7.5 },
    };

    const r1 = calculateCRS(bachelorsInput);
    const r2 = calculateCRS(twoOrMoreInput);
    expect(r2.eduTransferPoints).toBe(r1.eduTransferPoints);
  });
});
