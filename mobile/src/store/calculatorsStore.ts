import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/constants';
import type { FswInput } from '@/features/fsw/utils/fswCalculator';
import type { SirsInput } from '@/features/bcpnp/utils/sirsCalculator';
import type { SinpInput } from '@/features/sinp/utils/sinpCalculator';

/**
 * Persisted inputs for the FSW, BC PNP SIRS, and SINP calculators so they
 * survive navigating away (and app restarts), matching CRS — whose inputs live
 * in profileStore. `null` = never filled, so the screen falls back to its
 * DEFAULT_INPUT. Loaded once on boot by RootNavigator, like the other stores.
 */
type Inputs = {
  fsw: FswInput | null;
  sirs: SirsInput | null;
  sinp: SinpInput | null;
};

type CalculatorsStore = Inputs & {
  loaded: boolean;
  load: () => Promise<void>;
  setFsw: (input: FswInput) => void;
  setSirs: (input: SirsInput) => void;
  setSinp: (input: SinpInput) => void;
  clear: () => Promise<void>;
};

const EMPTY: Inputs = { fsw: null, sirs: null, sinp: null };

function persist(state: Inputs): void {
  const { fsw, sirs, sinp } = state;
  AsyncStorage.setItem(STORAGE_KEYS.CALCULATOR_INPUTS, JSON.stringify({ fsw, sirs, sinp })).catch(
    () => {},
  );
}

export const useCalculatorsStore = create<CalculatorsStore>((set, get) => ({
  ...EMPTY,
  loaded: false,

  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.CALCULATOR_INPUTS);
      set({ ...EMPTY, ...(raw ? (JSON.parse(raw) as Partial<Inputs>) : null), loaded: true });
    } catch {
      set({ ...EMPTY, loaded: true });
    }
  },

  setFsw: (fsw) => {
    set({ fsw });
    persist(get());
  },
  setSirs: (sirs) => {
    set({ sirs });
    persist(get());
  },
  setSinp: (sinp) => {
    set({ sinp });
    persist(get());
  },

  clear: async () => {
    set(EMPTY);
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.CALCULATOR_INPUTS);
    } catch {}
  },
}));
