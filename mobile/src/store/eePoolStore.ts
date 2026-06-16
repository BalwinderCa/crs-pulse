import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EE_POOL_URL, STORAGE_KEYS } from '@/constants';
import { EE_POOL_FALLBACK, isEePoolData, type EePoolData } from '@/features/analytics/data/eePool';

/**
 * Express Entry pool composition + Levels Plan, mirrored to GitHub and fetched
 * cache-first. `data` is never null — it starts at the bundled snapshot and is
 * upgraded to the live mirror when reachable. IRCC publishes these only
 * periodically, so a 7-day stale window is plenty.
 */
type EePoolStore = {
  data: EePoolData;
  /** true once the live mirror (not just the bundled seed) has loaded. */
  live: boolean;
  load: () => Promise<void>;
};

const STALE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export const useEePoolStore = create<EePoolStore>((set, get) => ({
  data: EE_POOL_FALLBACK,
  live: false,

  load: async () => {
    // 1. Hydrate from cache first (instant, offline-safe).
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.EE_POOL_CACHE);
      if (raw) {
        const cached = JSON.parse(raw) as { data: EePoolData; fetchedAt: string };
        if (isEePoolData(cached.data)) {
          set({ data: cached.data, live: true });
          if (Date.now() - new Date(cached.fetchedAt).getTime() < STALE_MS) return; // fresh
        }
      }
    } catch {
      // ignore — fall through to network
    }

    // 2. Refresh from the mirror when missing or stale.
    try {
      const res = await fetch(EE_POOL_URL, { headers: { Accept: 'application/json' } });
      if (!res.ok) return; // keep cache / bundled fallback
      const data = (await res.json()) as unknown;
      if (!isEePoolData(data)) return; // ignore bad payload — keep last good
      set({ data, live: true });
      await AsyncStorage.setItem(
        STORAGE_KEYS.EE_POOL_CACHE,
        JSON.stringify({ data, fetchedAt: new Date().toISOString() }),
      );
    } catch {
      // Offline / transient — keep whatever is in state (cache or bundled seed).
      if (!get().live) set({ data: EE_POOL_FALLBACK });
    }
  },
}));
