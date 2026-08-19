import AsyncStorage from '@react-native-async-storage/async-storage';
import { useProcessingTimesStore } from '@/store/processingTimesStore';
import { STORAGE_KEYS } from '@/constants';

const okJson = (body: unknown) =>
  Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) } as Response);

beforeEach(async () => {
  await AsyncStorage.clear();
  useProcessingTimesStore.setState({ times: null, updated: null });
  jest.restoreAllMocks();
});

describe('processingTimesStore', () => {
  it('fetches the mirror feed and caches it', async () => {
    jest.spyOn(global, 'fetch').mockImplementation(() =>
      okJson({ updated: 'June 8, 2026', times: { ee_cec: { months: 7, peopleWaiting: 60900 } } }),
    );

    await useProcessingTimesStore.getState().load();

    const state = useProcessingTimesStore.getState();
    expect(state.times?.ee_cec?.months).toBe(7);
    expect(state.updated).toBe('June 8, 2026');
    expect(await AsyncStorage.getItem(STORAGE_KEYS.PROCESSING_TIMES_CACHE)).not.toBeNull();
  });

  it('falls back to null (bundled) on fetch failure, not a crash', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('offline'));
    await useProcessingTimesStore.getState().load();
    expect(useProcessingTimesStore.getState().times).toBeNull();
  });

  it('ignores an empty/invalid payload (keeps bundled fallback)', async () => {
    jest.spyOn(global, 'fetch').mockImplementation(() => okJson({ updated: 'x', times: {} }));
    await useProcessingTimesStore.getState().load();
    expect(useProcessingTimesStore.getState().times).toBeNull();
  });

  it('serves fresh cache without hitting the network', async () => {
    await AsyncStorage.setItem(
      STORAGE_KEYS.PROCESSING_TIMES_CACHE,
      JSON.stringify({
        feed: { updated: 'May 1, 2026', times: { ee_fsw: { months: 8 } } },
        fetchedAt: new Date().toISOString(),
      }),
    );
    const spy = jest.spyOn(global, 'fetch');
    await useProcessingTimesStore.getState().load();
    expect(useProcessingTimesStore.getState().times?.ee_fsw?.months).toBe(8);
    expect(spy).not.toHaveBeenCalled();
  });

  // The exact scenario the push exists for: a fresh cache from minutes ago would
  // otherwise hide the very change the alert announced, for up to 6 hours.
  it('force bypasses the freshness window so a pushed change is visible immediately', async () => {
    const first = jest.spyOn(global, 'fetch').mockImplementation(() =>
      okJson({ updated: 'August 10, 2026', times: { ee_cec: { months: 6 } } }),
    );
    await useProcessingTimesStore.getState().load();
    expect(useProcessingTimesStore.getState().updated).toBe('August 10, 2026');

    first.mockImplementation(() =>
      okJson({ updated: 'September 10, 2026', times: { ee_cec: { months: 8 } } }),
    );

    // Unforced: cache is seconds old, so the network is never touched.
    await useProcessingTimesStore.getState().load();
    expect(useProcessingTimesStore.getState().updated).toBe('August 10, 2026');

    await useProcessingTimesStore.getState().load(true);
    expect(useProcessingTimesStore.getState().updated).toBe('September 10, 2026');
    expect(useProcessingTimesStore.getState().times?.ee_cec?.months).toBe(8);
  });

  it('a forced load that fails offline keeps the cached figures', async () => {
    jest.spyOn(global, 'fetch').mockImplementation(() =>
      okJson({ updated: 'August 10, 2026', times: { ee_cec: { months: 6 } } }),
    );
    await useProcessingTimesStore.getState().load();

    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('offline'));
    await useProcessingTimesStore.getState().load(true);
    expect(useProcessingTimesStore.getState().updated).toBe('August 10, 2026');
    expect(useProcessingTimesStore.getState().times?.ee_cec?.months).toBe(6);
  });
});
