import { buildPushHeaders } from '../../src/services/pushService';

describe('buildPushHeaders', () => {
  const original = process.env.EXPO_PUBLIC_PUSH_API_KEY;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.EXPO_PUBLIC_PUSH_API_KEY;
    } else {
      process.env.EXPO_PUBLIC_PUSH_API_KEY = original;
    }
  });

  it('includes JSON content headers without API key', () => {
    delete process.env.EXPO_PUBLIC_PUSH_API_KEY;
    expect(buildPushHeaders()).toEqual({
      'Content-Type': 'application/json',
      Accept: 'application/json',
    });
  });

  it('adds Bearer auth when API key is provided', () => {
    expect(buildPushHeaders('test-secret-key').Authorization).toBe('Bearer test-secret-key');
  });
});
