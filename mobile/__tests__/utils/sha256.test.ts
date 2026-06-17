import { sha256Hex } from '../../src/utils/sha256';

describe('sha256Hex', () => {
  // Canonical FIPS-180-4 test vectors (exact values).
  it('hashes the empty string', () => {
    expect(sha256Hex('')).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
  });

  it('hashes "abc"', () => {
    expect(sha256Hex('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('hashes the 448-bit message (exercises multi-block padding)', () => {
    expect(sha256Hex('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq')).toBe(
      '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1',
    );
  });

  // Structural guarantees relied on by the trial flow + the worker's length guard.
  it('always returns a 64-char lowercase hex digest', () => {
    for (const s of ['', 'a', 'device-id', 'héllo 🌍', 'x'.repeat(500)]) {
      expect(sha256Hex(s)).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it('is deterministic for the salted trial-id form', () => {
    expect(sha256Hex('crs-pulse.trial.v1:device-123')).toBe(
      sha256Hex('crs-pulse.trial.v1:device-123'),
    );
  });

  it('produces different digests for different inputs (incl. multi-byte)', () => {
    expect(sha256Hex('device-A')).not.toBe(sha256Hex('device-B'));
    expect(sha256Hex('café')).not.toBe(sha256Hex('cafe'));
  });
});
