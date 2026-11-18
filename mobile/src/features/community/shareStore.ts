import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/constants';
import { useTimelineStore } from '@/store/timelineStore';
import { sharedAorMonth, toSharedSteps, type ProgramId } from './model';
import { publishTimeline, unpublishTimeline } from './communityApi';

/**
 * The user's Community sharing settings. The shared steps themselves are not
 * stored: they are rebuilt from the live timeline and re-sent to the server
 * whenever it changes, so a shared timeline shows where its owner has reached.
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
  /** Saves the settings and publishes; false if the server couldn't be reached (it retries on the next change or launch). */
  share: (s: Omit<ShareSettings, 'sharedAt'>) => Promise<boolean>;
  /** Unpublishes, then forgets the settings; false (and still shared) if the server didn't confirm. */
  stop: () => Promise<boolean>;
};

// One server call at a time, so a first share can't create two rows.
let queue: Promise<unknown> = Promise.resolve();
const serial = <T,>(fn: () => Promise<T>): Promise<T> => {
  const next = queue.then(fn, fn);
  queue = next.catch(() => {});
  return next;
};

/** Sends the current timeline under the current settings; with no steps left, takes it down. */
function sync(settings: ShareSettings): Promise<void> {
  return serial(async () => {
    const milestones = useTimelineStore.getState().milestones;
    const steps = toSharedSteps(milestones, settings.showMonths);
    if (!steps.length) return unpublishTimeline();
    const aorMonth = sharedAorMonth(milestones);
    return publishTimeline({ alias: settings.alias, program: settings.program, steps, ...(aorMonth ? { aorMonth } : {}) });
  });
}

export const useShareStore = create<ShareStore>((set, get) => ({
  settings: null,
  loaded: false,
  load: async () => {
    if (get().loaded) return;
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.COMMUNITY_SHARE);
      const settings = raw ? (JSON.parse(raw) as ShareSettings) : null;
      set({ settings, loaded: true });
      // Catches up on a share or change that failed offline; the server ignores an unchanged timeline.
      if (settings) sync(settings).catch(() => {});
    } catch {
      set({ loaded: true });
    }
  },
  share: async (s) => {
    const settings: ShareSettings = { ...s, sharedAt: get().settings?.sharedAt ?? new Date().toISOString() };
    set({ settings });
    await AsyncStorage.setItem(STORAGE_KEYS.COMMUNITY_SHARE, JSON.stringify(settings)).catch(() => {});
    return sync(settings).then(() => true, () => false);
  },
  stop: async () => {
    try {
      await serial(unpublishTimeline);
    } catch {
      return false;
    }
    set({ settings: null });
    await AsyncStorage.removeItem(STORAGE_KEYS.COMMUNITY_SHARE).catch(() => {});
    return true;
  },
}));

useTimelineStore.subscribe((st, prev) => {
  const { settings } = useShareStore.getState();
  if (settings && st.milestones !== prev.milestones) sync(settings).catch(() => {});
});
