import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/constants';
import { DEFAULT_FILTERS, fetchCommunityPage } from './communityApi';
import { communityVisible, type SharedTimeline } from './model';

/**
 * The red dots on the Timeline tab, its Community sub-tab and the Settings tab.
 *
 *  • Community: the newest timeline in the feed (someone else's, newest first)
 *    is compared with the one the user last saw on the Community tab. A new
 *    share, or a shared timeline that gained or moved a step, changes it.
 *    It is a signature of that one row, so no update time leaves the server.
 *  • Settings: a one-time "new" dot for the 1.0.19 Settings changes (fonts,
 *    per-alert switches), cleared the first time the Settings tab opens.
 *
 * Like the draw and processing-times dots, a fresh install starts quiet: its
 * first check is recorded as seen. Someone updating from an older version
 * (onboarding already done) gets both dots once, pointing at what's new.
 */

/** Stored as the seen Community signature until a fresh install's first check records the real one. */
const QUIET_FIRST = 'quiet-first';

let loading: Promise<void> | null = null;

/** Bump to show the Settings dot again for a later release's Settings changes. */
export const SETTINGS_NEW_MARK = '1.0.19';

/** At most one feed check per this long (launch and return-to-app both ask). */
const CHECK_EVERY_MS = 10 * 60 * 1000;

/** Identifies a timeline's shared content: who, and their steps. */
export function timelineSignature(t: SharedTimeline): string {
  return `${t.id}|${t.steps.map((st) => `${st.type}@${st.day}`).join(',')}`;
}

type CommunityBadgeStore = {
  /** Signature of the newest timeline that isn't the user's own (null until checked, or none). */
  latest: string | null;
  /** Signature last seen on the Community tab (QUIET_FIRST on a fresh install: record the first check quietly). */
  seen: string | null;
  settingsSeen: string | null;
  loaded: boolean;
  checkedAt: number;
  /** Reads what was seen. `freshInstall` (onboarding not done yet) makes the first dots quiet. */
  load: (freshInstall: boolean) => Promise<void>;
  /** Fetches the newest timeline; throttled unless `force`. Never throws. */
  check: (force?: boolean) => Promise<void>;
  markCommunitySeen: () => Promise<void>;
  markSettingsSeen: () => Promise<void>;
};

export const useCommunityBadgeStore = create<CommunityBadgeStore>((set, get) => ({
  latest: null,
  seen: null,
  settingsSeen: null,
  loaded: false,
  checkedAt: 0,

  load: (freshInstall) => {
    loading = (async () => {
      try {
        let [seen, settingsSeen] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.COMMUNITY_SEEN_TOP),
          AsyncStorage.getItem(STORAGE_KEYS.SETTINGS_NEW_SEEN),
        ]);
        if (freshInstall && seen === null && settingsSeen === null) {
          // Written now, so a fresh install that closes before its first check still stays quiet.
          [seen, settingsSeen] = [QUIET_FIRST, SETTINGS_NEW_MARK];
          await AsyncStorage.multiSet([
            [STORAGE_KEYS.COMMUNITY_SEEN_TOP, seen],
            [STORAGE_KEYS.SETTINGS_NEW_SEEN, settingsSeen],
          ]).catch(() => {});
        }
        set({ seen, settingsSeen, loaded: true });
      } catch {
        set({ loaded: true });
      }
    })();
    return loading;
  },

  check: async (force = false) => {
    if (!communityVisible()) return;
    const now = Date.now();
    if (!force && now - get().checkedAt < CHECK_EVERY_MS) return;
    set({ checkedAt: now });
    if (loading) await loading;
    try {
      // A few rows, so the user's own (or a blocked one) at the top doesn't hide the next.
      const page = await fetchCommunityPage(DEFAULT_FILTERS, null, 3);
      const top = page.items.find((t) => !t.isMine);
      const latest = top ? timelineSignature(top) : null;
      set({ latest });
      if (get().seen === QUIET_FIRST && latest) await get().markCommunitySeen();
    } catch {
      // Offline or server error: keep the last answer, try again on a later check.
      set({ checkedAt: 0 });
    }
  },

  markCommunitySeen: async () => {
    const { latest, seen } = get();
    if (!latest || latest === seen) return;
    set({ seen: latest });
    await AsyncStorage.setItem(STORAGE_KEYS.COMMUNITY_SEEN_TOP, latest).catch(() => {});
  },

  markSettingsSeen: async () => {
    if (get().settingsSeen === SETTINGS_NEW_MARK) return;
    set({ settingsSeen: SETTINGS_NEW_MARK });
    await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS_NEW_SEEN, SETTINGS_NEW_MARK).catch(() => {});
  },
}));

/** Red dot on the Timeline tab and the Community sub-tab. */
export const useCommunityHasNew = () =>
  useCommunityBadgeStore((st) => st.loaded && st.seen !== QUIET_FIRST && st.latest !== null && st.latest !== st.seen);

/** One-time red dot on the Settings tab. */
export const useSettingsHasNew = () =>
  useCommunityBadgeStore((st) => st.loaded && st.settingsSeen !== SETTINGS_NEW_MARK);
