import { isEasProjectIdConfigured, resolveEasProjectId } from '../../src/utils/easConfig';

describe('easConfig', () => {
  it('rejects placeholder project ID', () => {
    expect(resolveEasProjectId('YOUR_EAS_PROJECT_ID')).toBeUndefined();
    expect(isEasProjectIdConfigured('YOUR_EAS_PROJECT_ID')).toBe(false);
  });

  it('rejects empty values', () => {
    expect(resolveEasProjectId('')).toBeUndefined();
    expect(resolveEasProjectId(undefined)).toBeUndefined();
  });

  it('accepts a real project ID', () => {
    expect(resolveEasProjectId('a1b2c3d4-e5f6-7890-abcd-ef1234567890')).toBe(
      'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    );
    expect(isEasProjectIdConfigured('a1b2c3d4-e5f6-7890-abcd-ef1234567890')).toBe(true);
  });
});
