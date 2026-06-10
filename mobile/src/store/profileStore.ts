import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/constants';
import type { Category } from '@/types';

// ─── Calculator inputs ────────────────────────────────────────────────────────
export type CalcInputs = {
  maritalStatus: 'single' | 'married' | 'married_not_accompanying';
  age: number;
  education: string;
  canadianEducation: 'none' | '1_2year' | '3year_plus';
  firstLangTest: string;
  firstLangSpeaking: number;
  firstLangListening: number;
  firstLangReading: number;
  firstLangWriting: number;
  hasSecondLang: boolean;
  secondLangTest: string;
  secondLangSpeaking: number;
  secondLangListening: number;
  secondLangReading: number;
  secondLangWriting: number;
  canadianWorkExp: number;
  foreignWorkExp: number;
  spouseEducation: string;
  spouseLangSpeaking: number;
  spouseLangListening: number;
  spouseLangReading: number;
  spouseLangWriting: number;
  spouseCanadianWorkExp: number;
  hasProvincialNomination: boolean;
  jobOffer: string;
  hasSiblingInCanada: boolean;
  hasTradeCert: boolean;
};

export const DEFAULT_CALC_INPUTS: CalcInputs = {
  maritalStatus: 'single',
  age: 30,
  education: 'bachelors',
  canadianEducation: 'none',
  firstLangTest: 'IELTS',
  firstLangSpeaking: 0,
  firstLangListening: 0,
  firstLangReading: 0,
  firstLangWriting: 0,
  hasSecondLang: false,
  secondLangTest: 'TEF',
  secondLangSpeaking: 0,
  secondLangListening: 0,
  secondLangReading: 0,
  secondLangWriting: 0,
  canadianWorkExp: 0,
  foreignWorkExp: 0,
  spouseEducation: 'secondary',
  spouseLangSpeaking: 0,
  spouseLangListening: 0,
  spouseLangReading: 0,
  spouseLangWriting: 0,
  spouseCanadianWorkExp: 0,
  hasProvincialNomination: false,
  jobOffer: 'none',
  hasSiblingInCanada: false,
  hasTradeCert: false,
};

// ─── Profile ──────────────────────────────────────────────────────────────────
export type ThemeMode = 'system' | 'light' | 'dark';

export type LocalProfile = {
  crs_score: number;
  category: Category;
  accent_color: string;
  theme: ThemeMode;
  calculatorInputs: CalcInputs;
};

const DEFAULT_PROFILE: LocalProfile = {
  crs_score: 0,
  category: 'CEC',
  accent_color: '#DC2626',
  theme: 'system',
  calculatorInputs: DEFAULT_CALC_INPUTS,
};

type ProfileStore = {
  profile: LocalProfile | null;
  resetKey: number;           // increments on hard reset — consumers can watch this
  load: () => Promise<void>;
  save: (data: Partial<LocalProfile>) => Promise<void>;
  saveCalcInputs: (inputs: CalcInputs) => Promise<void>;
  reset: () => Promise<void>; // wipes to defaults
  clear: () => void;
};

export const useProfileStore = create<ProfileStore>((set, get) => ({
  profile: null,
  resetKey: 0,

  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE);
      if (!raw) { set({ profile: DEFAULT_PROFILE }); return; }
      const parsed = JSON.parse(raw);
      const profile: LocalProfile = {
        ...DEFAULT_PROFILE,
        ...parsed,
        calculatorInputs: { ...DEFAULT_CALC_INPUTS, ...(parsed.calculatorInputs ?? {}) },
      };
      set({ profile });
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

  saveCalcInputs: async (inputs) => {
    const current = get().profile ?? DEFAULT_PROFILE;
    const updated = { ...current, calculatorInputs: inputs };
    set({ profile: updated });
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(updated));
    } catch {}
  },

  reset: async () => {
    set((s) => ({ profile: DEFAULT_PROFILE, resetKey: s.resetKey + 1 }));
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(DEFAULT_PROFILE));
    } catch {}
  },

  clear: () => set({ profile: null }),
}));
