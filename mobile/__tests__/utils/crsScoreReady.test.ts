import { isCrsScoreReady } from '../../src/utils/crsScoreReady';

describe('isCrsScoreReady', () => {
  it('returns false when any first-language skill is unset', () => {
    expect(isCrsScoreReady('IELTS', { speaking: 0, listening: 0, reading: 0, writing: 0 })).toBe(false);
  });

  it('returns false when any skill is below CLB 4', () => {
    // IELTS 4.0 = CLB 4 for speaking; 3.5 reading = CLB 4; but 4.5 listening = CLB 4
    // Use CLB 3 territory: IELTS speaking 3.5 is below CLB 4
    expect(isCrsScoreReady('IELTS', { speaking: 3.5, listening: 6.0, reading: 6.0, writing: 6.0 })).toBe(false);
  });

  it('returns true when all four skills are CLB 4+', () => {
    // IELTS speaking 4.0, listening 4.5, reading 3.5, writing 4.0 = all CLB 4+
    expect(isCrsScoreReady('IELTS', { speaking: 4.0, listening: 4.5, reading: 3.5, writing: 4.0 })).toBe(true);
  });

  it('returns true for CELPIP scores at CLB 4', () => {
    expect(isCrsScoreReady('CELPIP', { speaking: 4, listening: 4, reading: 4, writing: 4 })).toBe(true);
  });

  it('supports TEF Canada as first language (current scale)', () => {
    // Current-scale CLB 4 minima: speaking 328, listening 306, reading 306, writing 268
    expect(isCrsScoreReady('TEF', { speaking: 328, listening: 306, reading: 306, writing: 268 }, 'current')).toBe(true);
    expect(isCrsScoreReady('TEF', { speaking: 327, listening: 306, reading: 306, writing: 268 }, 'current')).toBe(false);
  });

  it('supports TCF Canada as first language', () => {
    // TCF CLB 4 minima: speaking 4, listening 331, reading 342, writing 4
    expect(isCrsScoreReady('TCF', { speaking: 4, listening: 331, reading: 342, writing: 4 })).toBe(true);
    expect(isCrsScoreReady('TCF', { speaking: 3, listening: 331, reading: 342, writing: 4 })).toBe(false);
  });
});
