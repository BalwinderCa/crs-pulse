import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/constants';

/**
 * Tracks the latest draw number the user has SEEN on the notifications page
 * (separate from LAST_SEEN_DRAW, which the draws store syncs on every fetch
 * for push de-duplication). Drives the bell badge in the app header.
 */

type NotificationsStore = {
  seenDraw: number | null;
  loaded: boolean;
  load: () => Promise<void>;
  markSeen: (drawNumber: number) => Promise<void>;
  /** Resets the seen-draw marker (used by "Reset All Data"). */
  clear: () => Promise<void>;
};

export const useNotificationsStore = create<NotificationsStore>((set) => ({
  seenDraw: null,
  loaded: false,

  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATIONS_SEEN_DRAW);
      set({ seenDraw: raw ? parseInt(raw, 10) : null, loaded: true });
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

  clear: async () => {
    set({ seenDraw: null });
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.NOTIFICATIONS_SEEN_DRAW);
    } catch {}
  },
}));
