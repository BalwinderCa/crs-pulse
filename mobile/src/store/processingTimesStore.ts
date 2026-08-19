import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PROCESSING_TIMES_URL, STORAGE_KEYS } from '@/constants';
import type { LiveProcessingTimes } from '@/features/tracker/data/processingTimes';

/**
 * Live IRCC processing times, mirrored to GitHub and fetched cache-first.
 *
 * `times === null` means "no live data yet" — consumers fall back to the bundled
 * figures in processingTimes.ts. IRCC refreshes monthly, so a 7-day stale window
 * is plenty; the cache makes the screen instant and offline-safe.
 */

type LiveFeed = { updated: string | null; times: LiveProcessingTimes };

type ProcessingTimesStore = {
  times: LiveProcessingTimes | null;
  updated: string | null;
  /** `force` skips the freshness window — used when a push tells us the data changed. */
  load: (force?: boolean) => Promise<void>;
};

// IRCC refreshes monthly, but the window is measured from *our* fetch, not theirs —
// at 7 days a fresh IRCC update stayed invisible for up to a week. 6h keeps boots
// cheap while surfacing an update the same day.
const STALE_MS = 6 * 60 * 60 * 1000; // 6 hours

function isValidFeed(v: unknown): v is LiveFeed {
  return !!v && typeof v === 'object' && typeof (v as LiveFeed).times === 'object';
}

export const useProcessingTimesStore = create<ProcessingTimesStore>((set, get) => ({
  times: null,
  updated: null,

  load: async (force = false) => {
    // 1. Hydrate from cache first (instant, offline-safe).
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.PROCESSING_TIMES_CACHE);
      if (raw) {
        const cached = JSON.parse(raw) as { feed: LiveFeed; fetchedAt: string };
        if (isValidFeed(cached.feed)) {
          set({ times: cached.feed.times, updated: cached.feed.updated });
          // A processing-times push IS the signal that this cache is wrong, so a
          // forced load must reach the network — otherwise the alert fires and the
          // app still shows the old figures until the window expires.
          if (!force && Date.now() - new Date(cached.fetchedAt).getTime() < STALE_MS) return;
        }
      }
    } catch {
      // ignore — fall through to network
    }

    // 2. Refresh from the mirror when missing or stale.
    try {
      const res = await fetch(PROCESSING_TIMES_URL, { headers: { Accept: 'application/json' } });
      if (!res.ok) return; // keep cache / bundled fallback
      const feed = (await res.json()) as unknown;
      if (!isValidFeed(feed) || Object.keys(feed.times).length === 0) return; // ignore bad payload
      set({ times: feed.times, updated: feed.updated });
      await AsyncStorage.setItem(
        STORAGE_KEYS.PROCESSING_TIMES_CACHE,
        JSON.stringify({ feed, fetchedAt: new Date().toISOString() }),
      );
    } catch {
      // Offline / transient — consumers keep using whatever is in state (cache or null→bundled).
      if (!get().times) set({ times: null });
    }
  },
}));
