import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEePoolStore } from '@/store/eePoolStore';
import { EE_POOL_FALLBACK } from '@/features/analytics/data/eePool';
import { STORAGE_KEYS } from '@/constants';

const okJson = (body: unknown) =>
  Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) } as Response);

// IRCC rounds feed shape: the pool is derived from the latest round's dd fields
// (top bands must sum to dd18). Levels are NOT in the feed.
const roundsFeed = {
  rounds: [
    {
      drawNumber: '419',
      drawDate: '2026-06-22',
      drawDateFull: 'June 22, 2026',
      dd1: '10', dd2: '20', dd3: '30', dd9: '40', dd15: '50', dd16: '5', dd17: '5', dd18: '160',
    },
  ],
};

// A valid cached EePoolData payload (the cache stores the derived shape).
const cachedData = {
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

  it('derives the live pool from the rounds feed, marks live, and caches it', async () => {
    jest.spyOn(global, 'fetch').mockImplementation(() => okJson(roundsFeed));
    await useEePoolStore.getState().load();
    const state = useEePoolStore.getState();
    expect(state.live).toBe(true);
    expect(state.data.updated).toBe('June 22, 2026');
    expect(state.data.pool.total).toBe(160);
    // 0–350 band = dd16 + dd17.
    expect(state.data.pool.distribution.find((b) => b.band === '0–350')?.count).toBe(10);
    // Levels Plan is not in the feed — kept from the bundled fallback.
    expect(state.data.levels.prTarget).toBe(EE_POOL_FALLBACK.levels.prTarget);
    expect(await AsyncStorage.getItem(STORAGE_KEYS.EE_POOL_CACHE)).not.toBeNull();
  });

  it('keeps the bundled fallback on fetch failure (no crash)', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('offline'));
    await useEePoolStore.getState().load();
    expect(useEePoolStore.getState().data).toBe(EE_POOL_FALLBACK);
    expect(useEePoolStore.getState().live).toBe(false);
  });

  it('ignores a malformed feed (keeps last good data)', async () => {
    jest.spyOn(global, 'fetch').mockImplementation(() => okJson({ rounds: [{ drawNumber: '5' }] }));
    await useEePoolStore.getState().load();
    expect(useEePoolStore.getState().data).toBe(EE_POOL_FALLBACK);
  });

  it('serves fresh cache without hitting the network', async () => {
    await AsyncStorage.setItem(
      STORAGE_KEYS.EE_POOL_CACHE,
      JSON.stringify({ data: cachedData, fetchedAt: new Date().toISOString() }),
    );
    const spy = jest.spyOn(global, 'fetch');
    await useEePoolStore.getState().load();
    expect(useEePoolStore.getState().data.levels.prTarget).toBe(365000);
    expect(spy).not.toHaveBeenCalled();
  });
});
