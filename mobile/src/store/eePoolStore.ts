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
  /** `force` skips the freshness window — a new draw changes this same feed. */
  load: (force?: boolean) => Promise<void>;
  updateFromRounds: (rounds: unknown) => Promise<void>;
};

// Same reason as processingTimesStore: the window runs from our fetch, not IRCC's
// publish, so 7 days hid a fresh mirror update for up to a week.
const STALE_MS = 6 * 60 * 60 * 1000; // 6 hours

export const useEePoolStore = create<EePoolStore>((set, get) => ({
  data: EE_POOL_FALLBACK,
  live: false,

  updateFromRounds: async (rounds: unknown) => {
    try {
      const derived = derivePoolFromRounds(rounds);
      if (!derived) return;

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
      // ignore — transient disk error should not crash
    }
  },

  load: async (force = false) => {
    // 1. Hydrate from cache first (instant, offline-safe).
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.EE_POOL_CACHE);
      if (raw) {
        const cached = JSON.parse(raw) as { data: EePoolData; fetchedAt: string };
        if (isEePoolData(cached.data)) {
          set({ data: cached.data, live: true });
          // The pool is derived from the SAME rounds feed as the draws, so a new-draw
          // push means this snapshot is out of date too — analytics would otherwise
          // score against a pool that predates the draw it is reacting to.
          if (!force && Date.now() - new Date(cached.fetchedAt).getTime() < STALE_MS) return;
        }
      }
    } catch {
      // ignore — fall through to network
    }

    // 2. Derive the live pool from the IRCC rounds feed when missing or stale.
    //    The Levels Plan isn't in the feed, so keep the current (cached/bundled)
    //    one — it's an annual figure maintained in the bundled snapshot.
    try {
      const res = await fetch(`${IRCC_ROUNDS_FEED_URL}?_=${Date.now()}`, {
        headers: { Accept: 'application/json', 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
      });
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
