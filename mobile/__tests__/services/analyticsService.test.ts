const mockCtor = jest.fn();

jest.mock('posthog-react-native', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation((key: string, options: unknown) => {
    mockCtor(key, options);
    return {};
  }),
}));

import {
  analytics,
  createAnalytics,
  track,
  trackScreen,
  ANALYTICS_AUTOCAPTURE,
} from '../../src/services/analyticsService';

describe('analyticsService', () => {
  beforeEach(() => mockCtor.mockClear());

  it('is off in the test build (no key, dev) and trackScreen is a no-op', () => {
    expect(analytics).toBeNull();
    expect(() => trackScreen('Home')).not.toThrow();
  });

  it('creates no client without an API key or in dev builds', () => {
    expect(createAnalytics(null, false)).toBeNull();
    expect(createAnalytics('phc_test', true)).toBeNull();
    expect(mockCtor).not.toHaveBeenCalled();
  });

  it('never creates person profiles or records sessions', () => {
    expect(createAnalytics('phc_test', false)).not.toBeNull();
    expect(mockCtor).toHaveBeenCalledWith('phc_test', expect.objectContaining({
      personProfiles: 'never',
      enableSessionReplay: false,
    }));
  });

  it('does not capture the text or labels of tapped elements', () => {
    expect(ANALYTICS_AUTOCAPTURE.propsToCapture).toEqual(['testID', 'ph-label']);
  });

  it('track is a no-op when analytics is off', () => {
    expect(() => track('ad_shown', { format: 'banner' })).not.toThrow();
  });

  it('only accepts the properties declared for each event', () => {
    // Compile-time guard, checked by `npm run type-check`.
    const typeChecks = () => {
      // @ts-expect-error — crs_calculated must not carry the score
      track('crs_calculated', { score: 478 });
      // @ts-expect-error — undeclared events are rejected
      track('profile_saved');
      // @ts-expect-error — ad_shown requires its format
      track('ad_shown');
    };
    expect(typeChecks).toBeInstanceOf(Function);
  });
});
