// The Settings "3 days without ads" rewarded ad: it must resolve exactly once,
// and only report `earned` when the SDK said the reward was earned.
const mockTrack = jest.fn();
jest.mock('@/services/analyticsService', () => ({ track: (...a: unknown[]) => mockTrack(...a) }));

let mockListeners: Record<string, (() => void)[]> = {};
const emit = (type: string) => (mockListeners[type] ?? []).forEach((cb) => cb());
const flush = () => new Promise((r) => setImmediate(r));
const mockShow = jest.fn();
const mockLoad = jest.fn();

jest.mock('react-native-google-mobile-ads', () => ({
  __esModule: true,
  default: () => ({ initialize: () => Promise.resolve() }),
  RewardedAd: {
    createForAdRequest: () => ({
      addAdEventListener: (type: string, cb: () => void) => {
        (mockListeners[type] ??= []).push(cb);
        return () => { mockListeners[type] = (mockListeners[type] ?? []).filter((x) => x !== cb); };
      },
      load: mockLoad,
      show: mockShow,
    }),
  },
  RewardedAdEventType: { LOADED: 'rewarded_loaded', EARNED_REWARD: 'rewarded_earned_reward' },
  AdEventType: { LOADED: 'loaded', ERROR: 'error', CLOSED: 'closed' },
  TestIds: { REWARDED: 'ca-app-pub-3940256099942544/1712485313' },
}));

function loadService(units: { ios: string; android: string }) {
  jest.resetModules();
  jest.doMock('@/constants', () => ({ ...jest.requireActual('@/constants'), ADMOB_REWARDED_AD_UNIT: units }));
  return require('../../src/services/adsService') as typeof import('../../src/services/adsService');
}

const LIVE = { ios: 'ca-app-pub-1/ios', android: 'ca-app-pub-1/android' };

describe('showRewardedAd', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListeners = {};
  });

  it('is unavailable, and hides the offer, when no rewarded unit is configured', async () => {
    const svc = loadService({ ios: '', android: '' });
    expect(svc.rewardedAdAvailable()).toBe(false);
    await expect(svc.showRewardedAd()).resolves.toBe('unavailable');
    expect(mockLoad).not.toHaveBeenCalled();
    expect(mockTrack).toHaveBeenCalledWith('rewarded_ad', { result: 'unavailable' });
  });

  it('resolves earned when the reward fires before the ad closes', async () => {
    const svc = loadService(LIVE);
    expect(svc.rewardedAdAvailable()).toBe(true);
    const p = svc.showRewardedAd();
    await flush();
    expect(mockLoad).toHaveBeenCalledTimes(1);
    emit('rewarded_loaded');
    expect(mockShow).toHaveBeenCalledTimes(1);
    emit('rewarded_earned_reward');
    emit('closed');
    await expect(p).resolves.toBe('earned');
    expect(mockTrack).toHaveBeenCalledWith('ad_shown', { format: 'rewarded' });
    expect(mockTrack).toHaveBeenCalledWith('rewarded_ad', { result: 'earned' });
  });

  it('resolves dismissed when the ad is closed before the reward', async () => {
    const svc = loadService(LIVE);
    const p = svc.showRewardedAd();
    await flush();
    emit('rewarded_loaded');
    emit('closed');
    await expect(p).resolves.toBe('dismissed');
  });

  it('resolves unavailable on a load error, and only once', async () => {
    const svc = loadService(LIVE);
    const p = svc.showRewardedAd();
    await flush();
    emit('error');
    emit('closed');
    await expect(p).resolves.toBe('unavailable');
    expect(mockTrack.mock.calls.filter((c) => c[0] === 'rewarded_ad')).toHaveLength(1);
  });

  it('gives up after the load cap when no ad arrives', async () => {
    jest.useFakeTimers();
    try {
      const svc = loadService(LIVE);
      const p = svc.showRewardedAd();
      jest.advanceTimersByTime(15_000);
      await expect(p).resolves.toBe('unavailable');
    } finally {
      jest.useRealTimers();
    }
  });
});
