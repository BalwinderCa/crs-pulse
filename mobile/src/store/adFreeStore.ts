import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AD_FREE_MS, STORAGE_KEYS } from '@/constants';

/**
 * The reward for watching a rewarded ad in Settings: no other ads until `until`.
 * Rewards don't stack — Settings only offers another once this one has ended —
 * so one sitting can't bank weeks of ad-free time. Kept on "Reset All Data",
 * like the app-open launch counter: it's an earned reward, not user data.
 */
type AdFreeStore = {
  until: number | null;
  loaded: boolean;
  load: () => Promise<boolean>;
  grant: (nowMs?: number) => Promise<number>;
};

export const isAdFree = (until: number | null, nowMs = Date.now()): boolean =>
  until !== null && until > nowMs;

export const useAdFreeStore = create<AdFreeStore>((set) => ({
  until: null,
  loaded: false,

  /** Reads the stored end time; resolves true while ads are off. */
  load: async () => {
    let until: number | null = null;
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.AD_FREE_UNTIL);
      const n = raw ? Number(raw) : NaN;
      until = Number.isFinite(n) ? n : null;
    } catch {}
    set({ until, loaded: true });
    return isAdFree(until);
  },

  /** Starts a fresh ad-free period; resolves its end time. */
  grant: async (nowMs = Date.now()) => {
    const until = nowMs + AD_FREE_MS;
    set({ until, loaded: true });
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.AD_FREE_UNTIL, String(until));
    } catch {}
    return until;
  },
}));
