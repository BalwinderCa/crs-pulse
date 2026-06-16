import { computePoolPosition, isEePoolData, EE_POOL_FALLBACK, type EePoolData } from '@/features/analytics/data/eePool';

const data: EePoolData = {
  updated: 'Jan 8, 2026',
  source: 'test',
  pool: {
    total: 100,
    distribution: [
      { band: '601–1200', min: 601, max: 1200, count: 10 },
      { band: '501–600', min: 501, max: 600, count: 20 },
      { band: '451–500', min: 451, max: 500, count: 30 },
      { band: '0–450', min: 0, max: 450, count: 40 },
    ],
  },
  levels: { year: 2026, prTarget: 380000, eeTarget: 124680, pnpTarget: 55000, pnpTargetPrev: 110000 },
};

describe('computePoolPosition', () => {
  it('counts whole bands above the user and flags their own band', () => {
    // Score 475 sits in the 451–500 band (count 30). Above it: 10 + 20 = 30.
    const pos = computePoolPosition(data, 475);
    const mine = pos.bands.find((b) => b.mine);
    expect(mine?.band).toBe('451–500');
    // peopleAhead = 30 (higher bands) + pro-rated within own band.
    // (500-475)/(500-451)=25/49 → ~0.51 * 30 ≈ 15 → 45 total.
    expect(pos.peopleAhead).toBeGreaterThanOrEqual(30);
    expect(pos.peopleAhead).toBeLessThanOrEqual(45);
    expect(pos.atOrAbove).toBe(60); // 10 + 20 + 30
    expect(pos.poolTotal).toBe(100);
  });

  it('a top-band score has (almost) nobody ahead', () => {
    const pos = computePoolPosition(data, 1200);
    expect(pos.peopleAhead).toBe(0);
    expect(pos.atOrAbove).toBe(10);
  });

  it('a bottom score has nearly the whole pool ahead', () => {
    const pos = computePoolPosition(data, 100);
    // bands above the 0–450 band: 10+20+30 = 60, plus pro-rated within own band.
    expect(pos.peopleAhead).toBeGreaterThanOrEqual(60);
    expect(pos.atOrAbove).toBe(100);
  });

  it('derives poolTotal from the distribution when total is 0', () => {
    const pos = computePoolPosition({ ...data, pool: { total: 0, distribution: data.pool.distribution } }, 700);
    expect(pos.poolTotal).toBe(100);
  });

  it('the bundled fallback is internally consistent', () => {
    expect(isEePoolData(EE_POOL_FALLBACK)).toBe(true);
    const sum = EE_POOL_FALLBACK.pool.distribution.reduce((s, b) => s + b.count, 0);
    expect(sum).toBe(EE_POOL_FALLBACK.pool.total);
  });
});

describe('isEePoolData', () => {
  it('rejects malformed payloads', () => {
    expect(isEePoolData(null)).toBe(false);
    expect(isEePoolData({})).toBe(false);
    expect(isEePoolData({ pool: { distribution: [] }, levels: { prTarget: 1 } })).toBe(false);
    expect(isEePoolData({ pool: { distribution: [{ band: 'x', min: 0, max: 1, count: 1 }] } })).toBe(false);
  });
});
