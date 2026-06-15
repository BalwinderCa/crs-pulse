import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/constants';

/**
 * Premium-access gate.
 *
 * STUB for layout work — entitlement is just a persisted local flag so both the
 * locked and unlocked states can be previewed on-device. This is where
 * RevenueCat (or any IAP entitlement check) will plug in later: replace `toggle`
 * with the real purchase/restore flow and hydrate `isPremium` from the receipt.
 */
type PremiumStore = {
  isPremium: boolean;
  loaded: boolean;
  load: () => Promise<void>;
  /** Demo-only flip; real builds will set this from an entitlement check. */
  toggle: () => Promise<void>;
};

export const usePremiumStore = create<PremiumStore>((set, get) => ({
  isPremium: false,
  loaded: false,

  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.PREMIUM);
      set({ isPremium: raw === 'true', loaded: true });
    } catch {
      set({ loaded: true });
    }
  },

  toggle: async () => {
    const next = !get().isPremium;
    set({ isPremium: next });
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.PREMIUM, next ? 'true' : 'false');
    } catch {}
  },
}));
