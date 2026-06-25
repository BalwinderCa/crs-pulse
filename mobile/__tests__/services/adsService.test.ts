import { AppState, Platform } from 'react-native';

// Lazily required inside initAds(); replace the real native modules entirely so
// the bridge code never loads in the JS test environment. Names are `mock`-
// prefixed so jest's factory-hoisting guard allows referencing them.
const mockGetTracking = jest.fn();
const mockRequestTracking = jest.fn();
const mockInitialize = jest.fn();
const mockAdsDefault = jest.fn(() => ({ initialize: mockInitialize }));

jest.mock('expo-tracking-transparency', () => ({
  getTrackingPermissionsAsync: (...a: unknown[]) => mockGetTracking(...a),
  requestTrackingPermissionsAsync: (...a: unknown[]) => mockRequestTracking(...a),
}));

jest.mock('react-native-google-mobile-ads', () => ({
  __esModule: true,
  default: (...a: unknown[]) => mockAdsDefault(...a),
}));

describe('adsService.initAds — iOS ATT timing & resilience', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Platform as unknown as { OS: string }).OS = 'ios';
    (AppState as unknown as { currentState: string }).currentState = 'active';
    mockInitialize.mockResolvedValue(undefined);
    mockAdsDefault.mockReturnValue({ initialize: mockInitialize });
  });

  it('prompts for ATT only when status is undetermined and re-askable, then initialises ads', async () => {
    mockGetTracking.mockResolvedValue({ status: 'undetermined', canAskAgain: true });
    mockRequestTracking.mockResolvedValue({ status: 'authorized' });

    const { initAds } = require('../../src/services/adsService');
    await initAds();

    expect(mockGetTracking).toHaveBeenCalledTimes(1);
    expect(mockRequestTracking).toHaveBeenCalledTimes(1);
    expect(mockInitialize).toHaveBeenCalledTimes(1);
  });

  it('does NOT re-prompt once a tracking decision has already been made', async () => {
    mockGetTracking.mockResolvedValue({ status: 'denied', canAskAgain: false });

    const { initAds } = require('../../src/services/adsService');
    await initAds();

    expect(mockRequestTracking).not.toHaveBeenCalled();
    // Ads still initialise — non-personalised ads are served without IDFA.
    expect(mockInitialize).toHaveBeenCalledTimes(1);
  });

  it('waits for the app to become active before requesting ATT', async () => {
    (AppState as unknown as { currentState: string }).currentState = 'background';
    let activeListener: ((s: string) => void) | undefined;
    const addSpy = jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation(((_evt: string, cb: (s: string) => void) => {
        activeListener = cb;
        return { remove: jest.fn() };
      }) as never);
    mockGetTracking.mockResolvedValue({ status: 'undetermined', canAskAgain: true });
    mockRequestTracking.mockResolvedValue({ status: 'authorized' });

    const { initAds } = require('../../src/services/adsService');
    const pending = initAds();

    // Still backgrounded → ATT must not have been requested yet.
    expect(mockRequestTracking).not.toHaveBeenCalled();

    activeListener?.('active'); // app comes to foreground
    await pending;

    expect(mockRequestTracking).toHaveBeenCalledTimes(1);
    expect(mockInitialize).toHaveBeenCalledTimes(1);
    addSpy.mockRestore();
  });

  it('never throws when the native ads module is unavailable', async () => {
    mockGetTracking.mockResolvedValue({ status: 'authorized', canAskAgain: false });
    mockAdsDefault.mockImplementation(() => {
      throw new Error('native module unavailable');
    });

    const { initAds } = require('../../src/services/adsService');
    await expect(initAds()).resolves.toBeUndefined();
  });

  it('skips the ATT flow entirely on Android', async () => {
    (Platform as unknown as { OS: string }).OS = 'android';

    const { initAds } = require('../../src/services/adsService');
    await initAds();

    expect(mockGetTracking).not.toHaveBeenCalled();
    expect(mockRequestTracking).not.toHaveBeenCalled();
    expect(mockInitialize).toHaveBeenCalledTimes(1);
  });
});
