import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

const mockAppOpenLoad = jest.fn();
const mockAppOpenShow = jest.fn();
const mockCreateForAdRequest = jest.fn(() => ({
  addAdEventListener: (type: string, cb: () => void) => {
    (adListeners[type] ??= []).push(cb);
    return () => {};
  },
  load: mockAppOpenLoad,
  show: mockAppOpenShow,
}));

let adListeners: Record<string, (() => void)[]> = {};
const emit = (type: string) => (adListeners[type] ?? []).forEach((cb) => cb());
const flush = () => new Promise((r) => setImmediate(r));

jest.mock('react-native-google-mobile-ads', () => ({
  __esModule: true,
  default: (...a: unknown[]) => mockAdsDefault(...a),
  AppOpenAd: { createForAdRequest: (...a: unknown[]) => mockCreateForAdRequest(...(a as [])) },
  AdEventType: { LOADED: 'loaded', ERROR: 'error', CLOSED: 'closed' },
  TestIds: { APP_OPEN: 'ca-app-pub-3940256099942544/5575463023' },
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

// The splash is held until showAppOpenAd resolves, so EVERY exit path has to
// resolve exactly once — a missed one strands the user on the logo forever.
describe('adsService.showAppOpenAd — splash gating', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    adListeners = {};
    (Platform as unknown as { OS: string }).OS = 'ios';
    (AppState as unknown as { currentState: string }).currentState = 'active';
    mockInitialize.mockResolvedValue(undefined);
    mockAdsDefault.mockReturnValue({ initialize: mockInitialize });
  });

  it('releases the splash at the cap when no ad loads', async () => {
    jest.useFakeTimers();
    const { showAppOpenAd } = require('../../src/services/adsService');
    const pending = showAppOpenAd(3000);
    jest.advanceTimersByTime(3000); // timer must be armed synchronously
    await expect(pending).resolves.toBe(false);
    jest.useRealTimers();
  });

  it('shows the ad on load and holds the splash until it is closed', async () => {
    const { showAppOpenAd } = require('../../src/services/adsService');
    const pending = showAppOpenAd(3000);
    await flush();

    emit('loaded');
    expect(mockAppOpenShow).toHaveBeenCalledTimes(1);

    emit('closed');
    await expect(pending).resolves.toBe(true);
  });

  it('releases the splash when the request errors (no fill)', async () => {
    const { showAppOpenAd } = require('../../src/services/adsService');
    const pending = showAppOpenAd(3000);
    await flush();

    emit('error');
    await expect(pending).resolves.toBe(false);
    expect(mockAppOpenShow).not.toHaveBeenCalled();
  });

  it('releases the splash even if a shown ad never reports CLOSED', async () => {
    jest.useFakeTimers();
    const { showAppOpenAd } = require('../../src/services/adsService');
    const pending = showAppOpenAd(3000);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    emit('loaded');
    expect(mockAppOpenShow).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(3000); // load cap must NOT fire once shown
    jest.advanceTimersByTime(60_000); // ceiling does
    await expect(pending).resolves.toBe(false);
    jest.useRealTimers();
  });

  it('never holds the splash when the ad unit is not configured for release', async () => {
    const { showAppOpenAd } = require('../../src/services/adsService');
    const dev = (global as unknown as { __DEV__: boolean }).__DEV__;
    (global as unknown as { __DEV__: boolean }).__DEV__ = false; // release build, no env id set
    await expect(showAppOpenAd(3000)).resolves.toBe(false);
    expect(mockCreateForAdRequest).not.toHaveBeenCalled();
    (global as unknown as { __DEV__: boolean }).__DEV__ = dev;
  });
});

describe('adsService.takeAppOpenAdTurn — every 3rd launch', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  it('shows on launch 3, 6, 9 — never on the first two', async () => {
    const { takeAppOpenAdTurn } = require('../../src/services/adsService');
    const turns: boolean[] = [];
    for (let i = 0; i < 9; i++) turns.push(await takeAppOpenAdTurn());
    expect(turns).toEqual([false, false, true, false, false, true, false, false, true]);
  });

  it('survives a corrupt counter instead of stalling every launch', async () => {
    await AsyncStorage.setItem('crs_pulse.app_open_launches', 'not-a-number');
    const { takeAppOpenAdTurn } = require('../../src/services/adsService');
    expect(await takeAppOpenAdTurn()).toBe(false); // restarts at 1
    expect(await takeAppOpenAdTurn()).toBe(false);
    expect(await takeAppOpenAdTurn()).toBe(true);
  });

  it('fails closed when storage is unavailable', async () => {
    const spy = jest
      .spyOn(AsyncStorage, 'getItem')
      .mockRejectedValueOnce(new Error('storage gone'));
    const { takeAppOpenAdTurn } = require('../../src/services/adsService');
    expect(await takeAppOpenAdTurn()).toBe(false);
    spy.mockRestore();
  });
});
