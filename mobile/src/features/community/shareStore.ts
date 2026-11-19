import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/constants';
import { useTimelineStore } from '@/store/timelineStore';
import { sharedAorMonth, toSharedSteps, type ProgramId } from './model';
import { CommunityError, blockTimeline, getBlocked, publishTimeline, unpublishTimeline } from './communityApi';

/**
 * The user's Community sharing settings. The shared steps themselves are not
 * stored: they are rebuilt from the live timeline and re-sent to the server
 * whenever it changes, so a shared timeline shows where its owner has reached.
 */
export type ShareSettings = {
  alias: string;
  program: ProgramId;
  showMonths: boolean;
  /** Preset avatar id (BuddyAvatar); the initial shows when absent. */
  avatar?: string;
  sharedAt: string;
};

/** ok: shared. offline: saved here, sent later. badName: the server refused the name; nothing changed. */
export type ShareResult = 'ok' | 'offline' | 'badName' | 'invalid';

type ShareStore = {
  settings: ShareSettings | null;
  loaded: boolean;
  load: () => Promise<void>;
  /** Saves the settings and publishes. If offline it retries on the next change or launch. */
  share: (s: Omit<ShareSettings, 'sharedAt'>) => Promise<ShareResult>;
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

/**
 * Sends the current timeline under the current settings. With no steps left it
 * stops sharing altogether, so adding a milestone later asks again instead of
 * quietly re-sharing.
 */
function sync(settings: ShareSettings): Promise<void> {
  return serial(async () => {
    const milestones = useTimelineStore.getState().milestones;
    // Each step's month and year is always shared (2026-11-18); a stored showMonths is ignored.
    const steps = toSharedSteps(milestones, true);
    if (!steps.length) {
      await unpublishTimeline();
      useShareStore.setState({ settings: null });
      await AsyncStorage.removeItem(STORAGE_KEYS.COMMUNITY_SHARE).catch(() => {});
      return;
    }
    const aorMonth = sharedAorMonth(milestones);
    return publishTimeline({
      alias: settings.alias, program: settings.program, steps,
      ...(aorMonth ? { aorMonth } : {}), ...(settings.avatar ? { avatar: settings.avatar } : {}),
    });
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
    const keep = async () => {
      set({ settings });
      await AsyncStorage.setItem(STORAGE_KEYS.COMMUNITY_SHARE, JSON.stringify(settings)).catch(() => {});
    };
    // Settings change only once the server has answered: swapping them early swaps the
    // Share button (which holds the form) for the share card, and a refused name came back blank.
    try {
      await sync(settings);
      await keep();
      return 'ok';
    } catch (e) {
      // Any other 4xx (e.g. a year typo making the timeline span 10+ years) will be refused again, so it isn't "offline".
      const refused = e instanceof CommunityError && e.status >= 400 && e.status < 500 && e.status !== 429;
      if (!refused) { await keep(); return 'offline'; } // saved; load() retries on the next launch
      return e.message === 'alias not allowed' ? 'badName' : 'invalid';
    }
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

/** Blocked timeline ids, in memory too, so the feed drops a card the moment it's blocked. */
export const useBlockedStore = create<{ ids: string[]; load: () => Promise<void>; block: (id: string) => Promise<void> }>((set, get) => ({
  ids: [],
  load: async () => set({ ids: await getBlocked() }),
  block: async (id) => {
    set({ ids: [...get().ids, id] });
    await blockTimeline(id);
  },
}));

useTimelineStore.subscribe((st, prev) => {
  const { settings } = useShareStore.getState();
  if (settings && st.milestones !== prev.milestones) sync(settings).catch(() => {});
});
