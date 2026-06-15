import {
  applyLiveTimes,
  findApplicationType,
  APPLICATION_CATEGORIES,
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
