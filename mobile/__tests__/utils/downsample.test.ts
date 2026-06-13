import { downsample, MAX_CHART_POINTS } from '../../src/utils/downsample';

describe('downsample', () => {
  it('returns the input unchanged when within the cap', () => {
    const arr = [1, 2, 3];
    expect(downsample(arr, 5)).toEqual([1, 2, 3]);
  });

  it('returns a copy, not the same reference', () => {
    const arr = [1, 2, 3];
    expect(downsample(arr, 5)).not.toBe(arr);
  });

  it('caps to maxPoints', () => {
    const arr = Array.from({ length: 350 }, (_, i) => i);
    const out = downsample(arr, MAX_CHART_POINTS);
    expect(out.length).toBe(MAX_CHART_POINTS);
  });

  it('always preserves the first and last elements', () => {
    const arr = Array.from({ length: 350 }, (_, i) => i);
    const out = downsample(arr, 60);
    expect(out[0]).toBe(0);
    expect(out[out.length - 1]).toBe(349);
  });

  it('preserves chronological order', () => {
    const arr = Array.from({ length: 200 }, (_, i) => i);
    const out = downsample(arr, 40);
    const sorted = [...out].sort((a, b) => a - b);
    expect(out).toEqual(sorted);
  });

  it('handles edge counts', () => {
    expect(downsample([1, 2, 3], 0)).toEqual([]);
    expect(downsample([1, 2, 3], 1)).toEqual([3]);
    expect(downsample([], 10)).toEqual([]);
  });
});
