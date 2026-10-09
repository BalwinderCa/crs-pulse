import {
  applyLiveTimes,
  findApplicationType,
  APPLICATION_CATEGORIES,
  peopleAheadFor,
  type LiveProcessingTimes,
} from '@/features/tracker/data/processingTimes';

describe('applyLiveTimes (live processing-times overlay)', () => {
  it('overrides months + peopleWaiting for matching types, leaves others bundled', () => {
    const live: LiveProcessingTimes = {
      ee_cec: { months: 9, peopleWaiting: 61000 },
    };
    const out = applyLiveTimes(APPLICATION_CATEGORIES, live);

    const cec = findApplicationType('economic', 'ee_cec', out)!;
    expect(cec.type.months).toBe(9);
    expect(cec.type.peopleWaiting).toBe(61000);

    // A type with no live entry is unchanged from the bundled value.
    const bundledFst = findApplicationType('economic', 'ee_fst', APPLICATION_CATEGORIES)!;
    const fst = findApplicationType('economic', 'ee_fst', out)!;
    expect(fst.type.months).toBe(bundledFst.type.months);
  });

  it('carries the per-month peopleAhead table onto the matching type', () => {
    const live: LiveProcessingTimes = {
      ee_cec: { months: 6, peopleAhead: { '2026-03': 17000, '2016-01': 0 } },
    };
    const cec = findApplicationType('economic', 'ee_cec', applyLiveTimes(APPLICATION_CATEGORIES, live))!;
    expect(cec.type.peopleAhead).toEqual({ '2026-03': 17000, '2016-01': 0 });
    expect(findApplicationType('economic', 'ee_cec', APPLICATION_CATEGORIES)!.type.peopleAhead).toBeUndefined();
  });

  it('returns the original categories unchanged when live data is null', () => {
    expect(applyLiveTimes(APPLICATION_CATEGORIES, null)).toBe(APPLICATION_CATEGORIES);
  });

  it('does not mutate the bundled categories', () => {
    const before = findApplicationType('economic', 'ee_cec', APPLICATION_CATEGORIES)!.type.months;
    applyLiveTimes(APPLICATION_CATEGORIES, { ee_cec: { months: 99 } });
    const after = findApplicationType('economic', 'ee_cec', APPLICATION_CATEGORIES)!.type.months;
    expect(after).toBe(before);
  });
});

describe('peopleAheadFor', () => {
  const table = { '2016-01': 0, '2026-07': 49000, '2026-08': 58900 };

  it('reads the exact application month', () => {
    expect(peopleAheadFor(table, '2026-07')).toBe(49000);
    expect(peopleAheadFor(table, '2016-01')).toBe(0); // IRCC "Less than 100"
  });

  it('says "not yet" for months after IRCC\'s table instead of guessing', () => {
    expect(peopleAheadFor(table, '2026-09')).toBe('notYet');
  });

  it('returns null with no table, or a month IRCC does not list', () => {
    expect(peopleAheadFor(undefined, '2026-07')).toBeNull();
    expect(peopleAheadFor(table, '2020-05')).toBeNull();
    expect(peopleAheadFor(table, '2015-06')).toBeNull();
  });
});
