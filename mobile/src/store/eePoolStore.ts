import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { IRCC_ROUNDS_FEED_URL, STORAGE_KEYS } from '@/constants';
import {
  EE_POOL_FALLBACK,
  derivePoolFromRounds,
  isEePoolData,
  type EePoolData,
} from '@/features/analytics/data/eePool';

/**
 * Express Entry pool composition + Levels Plan, cache-first. `data` is never
 * null — it starts at the bundled snapshot and is upgraded to the live pool,
 * which is derived from the IRCC rounds feed the app already fetches directly
 * (reliable on device IPs). The Levels Plan is annual and not in that feed, so
 * it stays bundled. IRCC updates the pool ~biweekly, so a 7-day window is fine.
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

    // 2. Derive the live pool from the IRCC rounds feed when missing or stale.
    //    The Levels Plan isn't in the feed, so keep the current (cached/bundled)
    //    one — it's an annual figure maintained in the bundled snapshot.
    try {
      const res = await fetch(IRCC_ROUNDS_FEED_URL, { headers: { Accept: 'application/json' } });
      if (!res.ok) return; // keep cache / bundled fallback
      const json = (await res.json()) as { rounds?: unknown };
      const derived = derivePoolFromRounds(json?.rounds);
      if (!derived) return; // malformed/incomplete feed — keep last good

      const prev = get().data;
      const data: EePoolData = {
        updated: derived.updated || prev.updated,
        source: prev.source,
        pool: derived.pool,
        levels: prev.levels,
      };
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
