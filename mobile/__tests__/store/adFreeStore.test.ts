import AsyncStorage from '@react-native-async-storage/async-storage';
import { AD_FREE_MS, STORAGE_KEYS } from '@/constants';
import { isAdFree, useAdFreeStore } from '@/store/adFreeStore';

describe('adFreeStore', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useAdFreeStore.setState({ until: null, loaded: false });
  });

  it('grants 3 days from now and persists the end time', async () => {
    const now = 1_000_000;
    const until = await useAdFreeStore.getState().grant(now);
    expect(until).toBe(now + AD_FREE_MS);
    expect(await AsyncStorage.getItem(STORAGE_KEYS.AD_FREE_UNTIL)).toBe(String(now + AD_FREE_MS));
  });

  it('load reports ad-free only while the period is running', async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.AD_FREE_UNTIL, String(Date.now() + 60_000));
    await expect(useAdFreeStore.getState().load()).resolves.toBe(true);
    await AsyncStorage.setItem(STORAGE_KEYS.AD_FREE_UNTIL, String(Date.now() - 1));
    await expect(useAdFreeStore.getState().load()).resolves.toBe(false);
  });

  it('treats a missing or corrupt value as not ad-free', async () => {
    await expect(useAdFreeStore.getState().load()).resolves.toBe(false);
    await AsyncStorage.setItem(STORAGE_KEYS.AD_FREE_UNTIL, 'garbage');
    await expect(useAdFreeStore.getState().load()).resolves.toBe(false);
    expect(useAdFreeStore.getState().until).toBeNull();
  });

  it('isAdFree compares against now', () => {
    expect(isAdFree(null)).toBe(false);
    expect(isAdFree(2000, 1000)).toBe(true);
    expect(isAdFree(1000, 1000)).toBe(false);
  });
});
