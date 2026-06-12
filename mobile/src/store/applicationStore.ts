import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/constants';

export type TrackedApplication = {
  categoryId: string;
  typeId: string;
  /** ISO date string; null = "haven't applied yet". */
  appliedDate: string | null;
};

type ApplicationStore = {
  application: TrackedApplication | null;
  loaded: boolean;
  load: () => Promise<void>;
  save: (app: TrackedApplication) => Promise<void>;
  clear: () => Promise<void>;
};

export const useApplicationStore = create<ApplicationStore>((set) => ({
  application: null,
  loaded: false,

  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.TRACKED_APPLICATION);
      set({ application: raw ? (JSON.parse(raw) as TrackedApplication) : null, loaded: true });
    } catch {
      set({ application: null, loaded: true });
    }
  },

  save: async (app) => {
    set({ application: app });
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.TRACKED_APPLICATION, JSON.stringify(app));
    } catch {}
  },

  clear: async () => {
    set({ application: null });
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.TRACKED_APPLICATION);
    } catch {}
  },
}));
