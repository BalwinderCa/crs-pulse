import {
  toCLB,
  calculateCRS,
  getClbBreakpoints,
  getClbBand,
  getTestRange,
  scoresToCLB,
  suggestCategory,
  type CRSInput,
  type LangScores,
  type TefScale,
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

// ─── TEF Canada CLB mapping (current scale, after Dec 10 2023) ────────────────

describe('TEF Canada CLB mapping (current scale)', () => {
  it('maps speaking 456 to CLB 7 on current TEF scale', () => {
    expect(toCLB('TEF', 'speaking', 456, 'current')).toBe(7);
  });

  it('maps speaking 310 to CLB 7 only on legacy pre-2019 scale', () => {
    expect(toCLB('TEF', 'speaking', 310, 'current')).toBe(0);
    expect(toCLB('TEF', 'speaking', 310, 'legacy')).toBe(7);
  });

  it('maps listening 434 to CLB 7 on current scale', () => {
    expect(toCLB('TEF', 'listening', 434, 'current')).toBe(7);
  });

  it('distinguishes Oct 2019 and current listening thresholds', () => {
    expect(toCLB('TEF', 'listening', 450, 'oct2019')).toBe(7);
    expect(toCLB('TEF', 'listening', 450, 'current')).toBe(7);
    expect(toCLB('TEF', 'listening', 462, 'current')).toBe(8);
  });
});

// ─── TCF Listening CLB mapping ────────────────────────────────────────────────

describe('TCF Listening CLB mapping', () => {
  it('returns CLB 0 for score 330 (below CLB 4 threshold)', () => {
    expect(toCLB('TCF', 'listening', 330)).toBe(0);
  });

  it('returns CLB 4 for score 331 (CLB 4 lower boundary)', () => {
    expect(toCLB('TCF', 'listening', 331)).toBe(4);
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

// ─── Score input ranges / slider breakpoints ─────────────────────────────────

describe('CLB breakpoints cover the full score scale (regression: TEF capped at 450)', () => {
  const SKILLS: Array<keyof LangScores> = ['speaking', 'listening', 'reading', 'writing'];

  it.each(SKILLS)('TEF current scale: CLB 10 reachable for %s', (skill) => {
    const bps = getClbBreakpoints('TEF', skill, 'current');
    const maxClb = toCLB('TEF', skill, Math.max(...bps), 'current');
    expect(maxClb).toBe(10);
  });

  it.each(SKILLS)('TEF Oct 2019 scale: CLB 10 reachable for %s', (skill) => {
    const bps = getClbBreakpoints('TEF', skill, 'oct2019');
    expect(toCLB('TEF', skill, Math.max(...bps), 'oct2019')).toBe(10);
  });

  it.each(SKILLS)('TEF legacy scale: CLB 10 reachable for %s', (skill) => {
    const bps = getClbBreakpoints('TEF', skill, 'legacy');
    expect(toCLB('TEF', skill, Math.max(...bps), 'legacy')).toBe(10);
  });

  it('TEF current speaking includes the official CLB 7–10 thresholds', () => {
    const bps = getClbBreakpoints('TEF', 'speaking', 'current');
    expect(bps).toEqual(expect.arrayContaining([456, 494, 518, 556]));
  });

  it.each(SKILLS)('TCF: CLB 10 reachable for %s', (skill) => {
    const bps = getClbBreakpoints('TCF', skill);
    expect(toCLB('TCF', skill, Math.max(...bps))).toBe(10);
  });

  it('TCF speaking band display tops out at 20, not 699', () => {
    const [lo, hi] = getClbBand('TCF', 'speaking', 16);
    expect(lo).toBe(16);
    expect(hi).toBe(20);
  });

  it('TEF legacy per-skill maxima follow the raw scales', () => {
    expect(getTestRange('TEF', 'speaking', 'legacy').max).toBe(450);
    expect(getTestRange('TEF', 'writing', 'legacy').max).toBe(450);
    expect(getTestRange('TEF', 'listening', 'legacy').max).toBe(360);
    expect(getTestRange('TEF', 'reading', 'legacy').max).toBe(300);
  });

  it('non-French test ranges are unchanged', () => {
    const scales: TefScale[] = ['current', 'oct2019', 'legacy'];
    for (const s of scales) {
      expect(getTestRange('IELTS', 'speaking', s)).toEqual({ min: 0, max: 9, step: 0.5 });
      expect(getTestRange('CELPIP', 'reading', s)).toEqual({ min: 1, max: 12, step: 1 });
      expect(getTestRange('PTE_CORE', 'writing', s)).toEqual({ min: 10, max: 90, step: 1 });
    }
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
    // English first (IELTS CLB 9+), French second (TCF CLB 7+)
    const input: CRSInput = {
      ...BASE_INPUT,
      firstLangTest: 'IELTS',
      firstLang: { speaking: 7.5, listening: 8.5, reading: 8.0, writing: 7.5 }, // all CLB 9+
      hasSecondLang: true,
      secondLangTest: 'TCF',
      secondLang: { speaking: 10, listening: 458, reading: 453, writing: 10 },
    };

    const result = calculateCRS(input);
    expect(result.additionalPoints).toBe(25);
  });

  it('awards 50 pts when English first at CLB 4 and French second CLB 7+', () => {
    // English first (IELTS CLB 4), French second (TCF CLB 7+)
    const input: CRSInput = {
      ...BASE_INPUT,
      firstLangTest: 'IELTS',
      firstLang: { speaking: 4.0, listening: 4.5, reading: 3.5, writing: 4.0 }, // all CLB 4
      hasSecondLang: true,
      secondLangTest: 'TCF',
      secondLang: { speaking: 10, listening: 458, reading: 453, writing: 10 },
    };

    const result = calculateCRS(input);
    expect(result.additionalPoints).toBe(50);
  });

  it('supports TEF Canada as FIRST official language with full points (current scale)', () => {
    // Current-scale CLB 10 minima: speaking 556, listening 546, reading 546, writing 558
    const input: CRSInput = {
      ...BASE_INPUT,
      firstLangTest: 'TEF',
      firstLang: { speaking: 556, listening: 546, reading: 546, writing: 558 },
      hasSecondLang: false,
      tefScale: 'current',
    };

    const result = calculateCRS(input);
    expect(result.firstLangClb).toEqual({ speaking: 10, listening: 10, reading: 10, writing: 10 });
    expect(result.firstLangPoints).toBe(136);     // 34 x 4 (single, CLB 10+)
    expect(result.additionalPoints).toBe(50);     // French NCLC 7+, no English test → unilingual bonus
  });

  it('awards 0 pts when French CLB below 7', () => {
    const input: CRSInput = {
      ...BASE_INPUT,
      firstLangTest: 'TCF',
      // TCF speaking 4 = CLB 4, below CLB 7
      firstLang: { speaking: 4, listening: 331, reading: 342, writing: 4 },
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
    // sits in the top transferability row: 25 / 50.
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

  it('trade cert and foreign work transfer stack in separate 50-pt buckets (max 100)', () => {
    const input: CRSInput = {
      ...BASE_INPUT,
      firstLangTest: 'CLB',
      firstLang: { speaking: 9, listening: 9, reading: 9, writing: 9 },
      foreignWorkExp: 3,
      canadianWorkExp: 2,
      hasTradeCert: true,
    };

    const result = calculateCRS(input);
    // Foreign work (50) + trade cert (50) = 100 skill transfer
    expect(result.skillTransferPoints).toBe(100);
    expect(result.workTransferPoints).toBe(100);
  });

  // IRCC transferability rows:
  //   "Post-secondary program credential of one year or longer" → 13 / 25
  //   (a single bachelor's belongs here, NOT in the 25/50 row)
  //   "Two or more credentials (one 3+ yrs)" / master's / doctoral → 25 / 50
  it('a single bachelors earns the 13/25 tier (NOT 25/50) for edu + language', () => {
    const clb7: CRSInput = {
      ...BASE_INPUT,
      education: 'bachelors',
      firstLang: { speaking: 6.0, listening: 6.0, reading: 6.0, writing: 6.0 }, // all CLB 7
    };
    const clb9: CRSInput = {
      ...BASE_INPUT,
      education: 'bachelors',
      firstLang: { speaking: 7.5, listening: 8.5, reading: 8.0, writing: 7.5 }, // all CLB 9+
    };
    expect(calculateCRS(clb7).eduTransferPoints).toBe(13);
    expect(calculateCRS(clb9).eduTransferPoints).toBe(25);
  });

  it('bachelors + Canadian work experience earns the 13/25 tier', () => {
    const base: CRSInput = {
      ...BASE_INPUT,
      education: 'bachelors',
      firstLangTest: 'CLB',
      firstLang: { speaking: 4, listening: 4, reading: 4, writing: 4 }, // below CLB 7 → no edu+lang pts
    };
    expect(calculateCRS({ ...base, canadianWorkExp: 1 }).eduTransferPoints).toBe(13);
    expect(calculateCRS({ ...base, canadianWorkExp: 2 }).eduTransferPoints).toBe(25);
  });

  it('masters and phd earn the 25/50 tier like two_or_more', () => {
    const mk = (education: CRSInput['education']): CRSInput => ({
      ...BASE_INPUT,
      education,
      firstLang: { speaking: 7.5, listening: 8.5, reading: 8.0, writing: 7.5 }, // CLB 9+
    });
    expect(calculateCRS(mk('masters')).eduTransferPoints).toBe(50);
    expect(calculateCRS(mk('phd')).eduTransferPoints).toBe(50);
    expect(calculateCRS(mk('two_or_more')).eduTransferPoints).toBe(50);
    // Regression: bachelors must stay strictly below the top tier
    expect(calculateCRS(mk('bachelors')).eduTransferPoints).toBe(25);
  });

  it('1yr/2yr diplomas keep the 13/25 tier', () => {
    const mk = (education: CRSInput['education']): CRSInput => ({
      ...BASE_INPUT,
      education,
      firstLang: { speaking: 6.0, listening: 6.0, reading: 6.0, writing: 6.0 }, // all CLB 7
    });
    expect(calculateCRS(mk('1year')).eduTransferPoints).toBe(13);
    expect(calculateCRS(mk('2year')).eduTransferPoints).toBe(13);
  });
});

// ─── Core human capital tables (verified against IRCC CRS grid) ──────────────

describe('Core human capital points', () => {
  it('education without spouse: secondary 30, 1yr 90, 2yr 98, bachelors 120', () => {
    const base = { ...BASE_INPUT, age: 30 };
    expect(calculateCRS({ ...base, education: 'secondary' }).educationPoints).toBe(30);
    expect(calculateCRS({ ...base, education: '1year' }).educationPoints).toBe(90);
    expect(calculateCRS({ ...base, education: '2year' }).educationPoints).toBe(98);
    expect(calculateCRS({ ...base, education: 'bachelors' }).educationPoints).toBe(120);
    expect(calculateCRS({ ...base, education: 'two_or_more' }).educationPoints).toBe(128);
    expect(calculateCRS({ ...base, education: 'masters' }).educationPoints).toBe(135);
    expect(calculateCRS({ ...base, education: 'phd' }).educationPoints).toBe(150);
  });

  it('education with spouse: secondary 28, 1yr 84, 2yr 91, bachelors 112', () => {
    const base = { ...BASE_INPUT, maritalStatus: 'married' as const, age: 30 };
    expect(calculateCRS({ ...base, education: 'secondary' }).educationPoints).toBe(28);
    expect(calculateCRS({ ...base, education: '1year' }).educationPoints).toBe(84);
    expect(calculateCRS({ ...base, education: '2year' }).educationPoints).toBe(91);
    expect(calculateCRS({ ...base, education: 'bachelors' }).educationPoints).toBe(112);
    expect(calculateCRS({ ...base, education: 'two_or_more' }).educationPoints).toBe(119);
    expect(calculateCRS({ ...base, education: 'masters' }).educationPoints).toBe(126);
    expect(calculateCRS({ ...base, education: 'phd' }).educationPoints).toBe(140);
  });

  it('first language without spouse: CLB 9 across all abilities = 124', () => {
    // CLB 9 single = 31/ability → 124
    const input: CRSInput = {
      ...BASE_INPUT,
      firstLangTest: 'CLB',
      firstLang: { speaking: 9, listening: 9, reading: 9, writing: 9 },
    };
    expect(calculateCRS(input).firstLangPoints).toBe(124);
  });

  it('first language without spouse: CLB 7 = 17/ability, CLB 6 = 9, CLB 4 = 6', () => {
    const mk = (clb: number): CRSInput => ({
      ...BASE_INPUT,
      firstLangTest: 'CLB',
      firstLang: { speaking: clb, listening: clb, reading: clb, writing: clb },
    });
    expect(calculateCRS(mk(7)).firstLangPoints).toBe(68);  // 17 × 4
    expect(calculateCRS(mk(6)).firstLangPoints).toBe(36);  // 9 × 4
    expect(calculateCRS(mk(4)).firstLangPoints).toBe(24);  // 6 × 4
    expect(calculateCRS(mk(3)).firstLangPoints).toBe(0);
  });

  it('first language with spouse: CLB 4 = 6/ability', () => {
    const input: CRSInput = {
      ...BASE_INPUT,
      maritalStatus: 'married',
      firstLangTest: 'CLB',
      firstLang: { speaking: 4, listening: 4, reading: 4, writing: 4 },
    };
    expect(calculateCRS(input).firstLangPoints).toBe(24);  // 6 × 4
  });

  it('second language subtotal caps at 24 single, 22 with spouse', () => {
    const base: CRSInput = {
      ...BASE_INPUT,
      firstLangTest: 'CLB',
      firstLang: { speaking: 9, listening: 9, reading: 9, writing: 9 },
      hasSecondLang: true,
      secondLangTest: 'CLB',
      // CLB 9+ on all four second-language abilities = 6 × 4 = 24 raw
      secondLang: { speaking: 9, listening: 9, reading: 9, writing: 9 },
    };
    expect(calculateCRS(base).secondLangPoints).toBe(24);
    expect(calculateCRS({ ...base, maritalStatus: 'married' }).secondLangPoints).toBe(22);
  });

  it('age points match IRCC grid (modified 2025-08-21)', () => {
    expect(calculateCRS({ ...BASE_INPUT, age: 29 }).agePoints).toBe(110);
    expect(calculateCRS({ ...BASE_INPUT, maritalStatus: 'married', age: 29 }).agePoints).toBe(100);
    expect(calculateCRS({ ...BASE_INPUT, age: 30 }).agePoints).toBe(105);
    expect(calculateCRS({ ...BASE_INPUT, age: 35 }).agePoints).toBe(77);
    expect(calculateCRS({ ...BASE_INPUT, age: 40 }).agePoints).toBe(50);
    expect(calculateCRS({ ...BASE_INPUT, age: 44 }).agePoints).toBe(6);
    expect(calculateCRS({ ...BASE_INPUT, age: 45 }).agePoints).toBe(0);
  });
});

// ─── PTE Core → CLB (IRCC official table) ──────────────────────────────────────
describe('PTE Core CLB mapping', () => {
  it('maps each ability across CLB bands', () => {
    // Speaking band thresholds: 89/84/76/68/59/51/42
    expect(toCLB('PTE_CORE', 'speaking', 89)).toBe(10);
    expect(toCLB('PTE_CORE', 'speaking', 84)).toBe(9);
    expect(toCLB('PTE_CORE', 'speaking', 76)).toBe(8);
    expect(toCLB('PTE_CORE', 'speaking', 68)).toBe(7);
    expect(toCLB('PTE_CORE', 'speaking', 59)).toBe(6);
    expect(toCLB('PTE_CORE', 'speaking', 51)).toBe(5);
    expect(toCLB('PTE_CORE', 'speaking', 42)).toBe(4);
    expect(toCLB('PTE_CORE', 'speaking', 41)).toBe(0);
    // Listening: 89/82/71/60/50/39/28
    expect(toCLB('PTE_CORE', 'listening', 82)).toBe(9);
    expect(toCLB('PTE_CORE', 'listening', 28)).toBe(4);
    expect(toCLB('PTE_CORE', 'listening', 27)).toBe(0);
    // Reading: 88/78/69/60/51/42/33
    expect(toCLB('PTE_CORE', 'reading', 88)).toBe(10);
    expect(toCLB('PTE_CORE', 'reading', 33)).toBe(4);
    expect(toCLB('PTE_CORE', 'reading', 32)).toBe(0);
    // Writing: 90/88/79/69/60/51/41
    expect(toCLB('PTE_CORE', 'writing', 90)).toBe(10);
    expect(toCLB('PTE_CORE', 'writing', 79)).toBe(8);
    expect(toCLB('PTE_CORE', 'writing', 41)).toBe(4);
    expect(toCLB('PTE_CORE', 'writing', 40)).toBe(0);
  });

  it('feeds through scoresToCLB and calculateCRS', () => {
    const clb = scoresToCLB('PTE_CORE', { speaking: 84, listening: 82, reading: 78, writing: 88 });
    expect(clb).toEqual({ speaking: 9, listening: 9, reading: 9, writing: 9 });
    const total = calculateCRS({
      ...BASE_INPUT,
      firstLangTest: 'PTE_CORE',
      firstLang: { speaking: 84, listening: 82, reading: 78, writing: 88 },
    }).total;
    expect(total).toBeGreaterThan(0);
  });
});

// ─── IELTS below-CLB-4 floor on every ability ──────────────────────────────────
describe('IELTS returns 0 below the CLB 4 floor', () => {
  it('all four abilities clamp to 0 when below minimum', () => {
    expect(toCLB('IELTS', 'speaking', 3.5)).toBe(0);
    expect(toCLB('IELTS', 'listening', 4.0)).toBe(0);
    expect(toCLB('IELTS', 'reading', 3.0)).toBe(0);
    expect(toCLB('IELTS', 'writing', 3.5)).toBe(0);
  });
});

// ─── Category suggestion ───────────────────────────────────────────────────────
describe('suggestCategory', () => {
  const clb = (n: number): LangScores => ({ speaking: n, listening: n, reading: n, writing: n });

  it('PNP dominates when a nomination is held', () => {
    expect(suggestCategory({ ...BASE_INPUT, hasProvincialNomination: true }, clb(9))).toBe('PNP');
  });

  it('French stream when first test is French and NCLC 7+', () => {
    expect(suggestCategory({ ...BASE_INPUT, firstLangTest: 'TEF' }, clb(7))).toBe('French');
    expect(suggestCategory({ ...BASE_INPUT, firstLangTest: 'TCF' }, clb(8))).toBe('French');
  });

  it('CEC with Canadian work experience', () => {
    expect(suggestCategory({ ...BASE_INPUT, canadianWorkExp: 2 }, clb(8))).toBe('CEC');
  });

  it('FST with a trade certificate and CLB 5+', () => {
    expect(suggestCategory({ ...BASE_INPUT, hasTradeCert: true }, clb(5))).toBe('FST');
  });

  it('FSW as the default profile', () => {
    expect(suggestCategory({ ...BASE_INPUT }, clb(8))).toBe('FSW');
  });
});
