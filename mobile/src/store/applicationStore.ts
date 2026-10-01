import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/constants';

export type TrackedApplication = {
  categoryId: string;
  typeId: string;
  /** ISO date string; null = "haven't applied yet". */
  appliedDate: string | null;
};

/** A decided application, kept when the user moves on to the next one (PR card, citizenship…). */
export type PastApplication = TrackedApplication & {
  /** YYYY-MM-DD of the logged Final Decision, if there was one. */
  decidedDate: string | null;
  /** YYYY-MM-DD of a logged COPR milestone, if there was one. */
  coprDate: string | null;
};

type ApplicationStore = {
  application: TrackedApplication | null;
  /** Newest first. */
  history: PastApplication[];
  loaded: boolean;
  load: () => Promise<void>;
  save: (app: TrackedApplication) => Promise<void>;
  /**
   * Starts tracking `next` and files the current application into history with
   * its outcome. Called only when the new one is saved, so cancelling the setup
   * flow leaves the current application untouched.
   */
  startNext: (next: TrackedApplication, outcome: { decidedDate: string | null; coprDate: string | null }) => Promise<void>;
  /** Wipes the current application and its history (used by "Reset All Data"). */
  clear: () => Promise<void>;
};

const isPast = (x: unknown): x is PastApplication => {
  const a = x as Partial<PastApplication> | null;
  return !!a && typeof a.categoryId === 'string' && typeof a.typeId === 'string';
};

export const useApplicationStore = create<ApplicationStore>((set, get) => ({
  application: null,
  history: [],
  loaded: false,

  load: async () => {
    try {
      const [raw, rawHistory] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.TRACKED_APPLICATION),
        AsyncStorage.getItem(STORAGE_KEYS.APPLICATION_HISTORY),
      ]);
      const parsed: unknown = rawHistory ? JSON.parse(rawHistory) : [];
      set({
        application: raw ? (JSON.parse(raw) as TrackedApplication) : null,
        history: Array.isArray(parsed) ? parsed.filter(isPast) : [],
        loaded: true,
      });
    } catch {
      set({ application: null, history: [], loaded: true });
    }
  },

  save: async (app) => {
    set({ application: app });
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.TRACKED_APPLICATION, JSON.stringify(app));
    } catch {}
  },

  startNext: async (next, outcome) => {
    const current = get().application;
    const history = current ? [{ ...current, ...outcome }, ...get().history] : get().history;
    set({ application: next, history });
    try {
      await AsyncStorage.multiSet([
        [STORAGE_KEYS.TRACKED_APPLICATION, JSON.stringify(next)],
        [STORAGE_KEYS.APPLICATION_HISTORY, JSON.stringify(history)],
      ]);
    } catch {}
  },

  clear: async () => {
    set({ application: null, history: [] });
    try {
      await AsyncStorage.multiRemove([STORAGE_KEYS.TRACKED_APPLICATION, STORAGE_KEYS.APPLICATION_HISTORY]);
    } catch {}
  },
}));
