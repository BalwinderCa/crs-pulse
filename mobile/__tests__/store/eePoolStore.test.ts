import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEePoolStore } from '@/store/eePoolStore';
import { EE_POOL_FALLBACK } from '@/features/analytics/data/eePool';
import { STORAGE_KEYS } from '@/constants';

const okJson = (body: unknown) =>
  Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) } as Response);

const validFeed = {
  updated: 'February 1, 2026',
  source: 'test',
  pool: { total: 50, distribution: [{ band: '601–1200', min: 601, max: 1200, count: 50 }] },
  levels: { year: 2026, prTarget: 365000, eeTarget: 124000, pnpTarget: 55000, pnpTargetPrev: 110000 },
};

beforeEach(async () => {
  await AsyncStorage.clear();
  useEePoolStore.setState({ data: EE_POOL_FALLBACK, live: false });
  jest.restoreAllMocks();
});

describe('eePoolStore', () => {
  it('starts on the bundled fallback before any load', () => {
    expect(useEePoolStore.getState().data).toBe(EE_POOL_FALLBACK);
    expect(useEePoolStore.getState().live).toBe(false);
  });

  it('fetches the mirror, marks live, and caches it', async () => {
    jest.spyOn(global, 'fetch').mockImplementation(() => okJson(validFeed));
    await useEePoolStore.getState().load();
    const state = useEePoolStore.getState();
    expect(state.live).toBe(true);
    expect(state.data.levels.prTarget).toBe(365000);
    expect(await AsyncStorage.getItem(STORAGE_KEYS.EE_POOL_CACHE)).not.toBeNull();
  });

  it('keeps the bundled fallback on fetch failure (no crash)', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('offline'));
    await useEePoolStore.getState().load();
    expect(useEePoolStore.getState().data).toBe(EE_POOL_FALLBACK);
    expect(useEePoolStore.getState().live).toBe(false);
  });

  it('ignores an invalid payload (keeps last good data)', async () => {
    jest.spyOn(global, 'fetch').mockImplementation(() => okJson({ pool: {}, junk: true }));
    await useEePoolStore.getState().load();
    expect(useEePoolStore.getState().data).toBe(EE_POOL_FALLBACK);
  });

  it('serves fresh cache without hitting the network', async () => {
    await AsyncStorage.setItem(
      STORAGE_KEYS.EE_POOL_CACHE,
      JSON.stringify({ data: validFeed, fetchedAt: new Date().toISOString() }),
    );
    const spy = jest.spyOn(global, 'fetch');
    await useEePoolStore.getState().load();
    expect(useEePoolStore.getState().data.levels.prTarget).toBe(365000);
    expect(spy).not.toHaveBeenCalled();
  });
});
