import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/constants';
import type { ProgramId } from './model';

/**
 * The user's Community sharing settings. The shared steps themselves are not
 * stored: they are rebuilt from the live timeline, so a shared timeline always
 * shows exactly where its owner has reached.
 */
export type ShareSettings = {
  alias: string;
  program: ProgramId;
  showMonths: boolean;
  sharedAt: string;
};

type ShareStore = {
  settings: ShareSettings | null;
  loaded: boolean;
  load: () => Promise<void>;
  share: (s: Omit<ShareSettings, 'sharedAt'>) => Promise<void>;
  stop: () => Promise<void>;
};

export const useShareStore = create<ShareStore>((set, get) => ({
  settings: null,
  loaded: false,
  load: async () => {
    if (get().loaded) return;
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.COMMUNITY_SHARE);
      set({ settings: raw ? (JSON.parse(raw) as ShareSettings) : null, loaded: true });
    } catch {
      set({ loaded: true });
    }
  },
  share: async (s) => {
    const settings: ShareSettings = { ...s, sharedAt: get().settings?.sharedAt ?? new Date().toISOString() };
    set({ settings });
    await AsyncStorage.setItem(STORAGE_KEYS.COMMUNITY_SHARE, JSON.stringify(settings)).catch(() => {});
  },
  stop: async () => {
    set({ settings: null });
    await AsyncStorage.removeItem(STORAGE_KEYS.COMMUNITY_SHARE).catch(() => {});
  },
}));
