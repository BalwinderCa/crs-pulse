import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/constants';
import type { Category } from '@/types';

export type LocalProfile = {
  crs_score: number;
  category: Category;
};

const DEFAULT_PROFILE: LocalProfile = {
  crs_score: 0,
  category: 'CEC',
};

type ProfileStore = {
  profile: LocalProfile | null; // null = not loaded
  load: () => Promise<void>;
  save: (data: Partial<LocalProfile>) => Promise<void>;
  clear: () => void;
};

export const useProfileStore = create<ProfileStore>((set, get) => ({
  profile: null,

  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE);
      const parsed: LocalProfile = raw ? { ...DEFAULT_PROFILE, ...JSON.parse(raw) } : DEFAULT_PROFILE;
      set({ profile: parsed });
    } catch {
      set({ profile: DEFAULT_PROFILE });
    }
  },

  save: async (data) => {
    const current = get().profile ?? DEFAULT_PROFILE;
    const updated = { ...current, ...data };
    set({ profile: updated });
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(updated));
    } catch {}
  },

  clear: () => set({ profile: null }),
}));
