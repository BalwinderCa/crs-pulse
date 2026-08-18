import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/constants';

/**
 * Tracks what the user has already SEEN, so the app can badge what's new:
 *  • `seenDraw`       — latest draw number seen on the notifications page
 *    (separate from LAST_SEEN_DRAW, which the draws store syncs on every fetch
 *    for push de-duplication). Drives the bell badge in the app header.
 *  • `seenProcessing` — IRCC processing-times `updated` label seen on the
 *    processing-times page. Drives the hamburger + menu-row badge.
 */

type NotificationsStore = {
  seenDraw: number | null;
  seenProcessing: string | null;
  loaded: boolean;
  load: () => Promise<void>;
  markSeen: (drawNumber: number) => Promise<void>;
  markProcessingSeen: (updated: string) => Promise<void>;
  /** Resets the seen markers (used by "Reset All Data"). */
  clear: () => Promise<void>;
};

export const useNotificationsStore = create<NotificationsStore>((set) => ({
  seenDraw: null,
  seenProcessing: null,
  loaded: false,

  load: async () => {
    try {
      const [raw, proc] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATIONS_SEEN_DRAW),
        AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATIONS_SEEN_PROCESSING),
      ]);
      set({ seenDraw: raw ? parseInt(raw, 10) : null, seenProcessing: proc, loaded: true });
    } catch {
      set({ loaded: true });
    }
  },

  markSeen: async (drawNumber) => {
    set({ seenDraw: drawNumber });
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATIONS_SEEN_DRAW, String(drawNumber));
    } catch {}
  },

  markProcessingSeen: async (updated) => {
    set({ seenProcessing: updated });
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATIONS_SEEN_PROCESSING, updated);
    } catch {}
  },

  clear: async () => {
    set({ seenDraw: null, seenProcessing: null });
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.NOTIFICATIONS_SEEN_DRAW,
        STORAGE_KEYS.NOTIFICATIONS_SEEN_PROCESSING,
      ]);
    } catch {}
  },
}));
