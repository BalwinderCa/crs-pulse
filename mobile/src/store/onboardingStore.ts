import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/constants';

type OnboardingStore = {
  isComplete: boolean | null; // null = not loaded yet
  load: () => Promise<void>;
  setComplete: () => Promise<void>;
  /** Clear in-memory only (on logout) — AsyncStorage key preserved for next login */
  clearStore: () => void;
  /** Delete AsyncStorage key + set false — triggers re-run of wizard */
  reset: () => Promise<void>;
};

export const useOnboardingStore = create<OnboardingStore>((set) => ({
  isComplete: null,

  load: async () => {
    try {
      const val = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETE);
      set({ isComplete: val === 'true' });
    } catch {
      set({ isComplete: false });
    }
  },

  setComplete: async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETE, 'true');
    } catch {}
    set({ isComplete: true });
  },

  clearStore: () => {
    set({ isComplete: null });
  },

  reset: async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.ONBOARDING_COMPLETE);
    } catch {}
    set({ isComplete: false });
  },
}));
