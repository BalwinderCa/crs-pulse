import { create } from 'zustand';
import { Alert, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import i18n from '@/i18n';
import { STORAGE_KEYS } from '@/constants';
import {
  registerForPushNotifications,
  unregisterPushNotifications,
  type PushRegisterFailure,
} from '@/services/pushService';
import { track } from '@/services/analyticsService';
import { useTimelineStore } from '@/store/timelineStore';
import { isProOn, useProStore } from '@/store/proStore';
import { sharedAorMonth } from '@/features/community/model';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    // `shouldShowAlert` is the SDK 52 field; `shouldShowBanner`/`shouldShowList`
    // are its SDK 53+ replacements. Setting all three keeps foreground display
    // working across the Expo upgrade without a behavioural change.
    shouldShowAlert:  true,
    shouldShowBanner: true,
    shouldShowList:   true,
    shouldPlaySound:  true,
    shouldSetBadge:   false,
  }),
});

// Track latest draw number so we don't duplicate alerts the server already sent
export async function syncLastSeenDraw(draws: { draw_number: number }[]) {
  try {
    const latestDraw = draws[0];
    if (!latestDraw) return;
    await AsyncStorage.setItem(STORAGE_KEYS.LAST_SEEN_DRAW, String(latestDraw.draw_number));
  } catch {}
}

export type PushPrefs = { draws: boolean; times: boolean; aor: boolean };
const OFF: PushPrefs = { draws: false, times: false, aor: false };
const anyOn = (p: PushPrefs) => p.draws || p.times || p.aor;

function failureKey(reason: PushRegisterFailure): string {
  const map: Record<PushRegisterFailure, string> = {
    simulator: 'common.notifSimulator',
    expo_go: 'common.notifExpoGo',
    not_configured: 'common.notifNotConfigured',
    permission_denied: 'common.notifPermissionDenied',
    token_failed: 'common.notifTokenFailed',
    server_error: 'common.notifServerError',
  };
  return map[reason];
}

/** The device registers (with these prefs) while any alert is on, and revokes when all are off. */
function register(p: PushPrefs) {
  // Pro alerts are sent as off once the trial is over (without Pro), so the server never outlasts
  // what the app shows; the saved choice stays for when they get Pro.
  const pro = isProOn(useProStore.getState());
  const aorMonth = pro && p.aor ? sharedAorMonth(useTimelineStore.getState().milestones) ?? null : null;
  return registerForPushNotifications({ draws: p.draws, times: pro && p.times, aorMonth }, useProStore.getState().userId);
}

type PushPrefsStore = {
  prefs: PushPrefs;
  loading: boolean;
  /** Reads saved prefs and re-registers so the server has the current AOR month. */
  load: () => Promise<void>;
  set: (change: Partial<PushPrefs>) => Promise<void>;
  /** Re-registers with the current prefs (e.g. once Pro status is known), if any alert is on. */
  resync: () => Promise<void>;
};

let busy = false;

export const usePushPrefs = create<PushPrefsStore>((setState, get) => ({
  prefs: OFF,
  loading: true,

  load: async () => {
    try {
      const [draws, saved] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.DRAW_NOTIFICATIONS),
        AsyncStorage.getItem(STORAGE_KEYS.PUSH_PREFS),
      ]);
      const d = draws === 'true';
      // Before 1.0.19 one switch sent draws and processing times together.
      const rest = saved ? (JSON.parse(saved) as Partial<PushPrefs>) : { times: d, aor: false };
      const prefs = { draws: d, times: rest.times === true, aor: rest.aor === true };
      setState({ prefs });
      if (anyOn(prefs)) await register(prefs);
    } catch {
      // keep OFF
    } finally {
      setState({ loading: false });
    }
  },

  resync: async () => {
    const p = get().prefs;
    if (anyOn(p)) await register(p).catch(() => {});
  },

  // Flip at once and do the push (un)registration behind it: the token fetch +
  // worker round trip took long enough that the toggle seemed to hang. A failed
  // enable flips back and explains why.
  set: async (change) => {
    if (busy) return;
    busy = true;
    const prev = get().prefs;
    const next = { ...prev, ...change };
    setState({ prefs: next });
    try {
      if (anyOn(next)) {
        const result = await register(next);
        if (!result.ok) {
          setState({ prefs: prev });
          track('push_enable_failed', { reason: result.reason });
          if (result.reason === 'permission_denied') {
            Alert.alert(i18n.t('common.notificationsDisabled'), i18n.t('common.notifPermissionDenied'), [
              { text: i18n.t('common.cancel'), style: 'cancel' },
              { text: i18n.t('common.openSettings'), onPress: () => Linking.openSettings() },
            ]);
          } else {
            Alert.alert(i18n.t('common.notificationsUnavailable'), i18n.t(failureKey(result.reason)));
          }
          return;
        }
      } else {
        await unregisterPushNotifications();
      }
      if (anyOn(next) !== anyOn(prev)) track(anyOn(next) ? 'push_enabled' : 'push_disabled');
      await AsyncStorage.multiSet([
        [STORAGE_KEYS.DRAW_NOTIFICATIONS, next.draws ? 'true' : 'false'],
        [STORAGE_KEYS.PUSH_PREFS, JSON.stringify({ times: next.times, aor: next.aor })],
      ]);
    } catch {
      setState({ prefs: prev }); // unexpected throw: show the state we actually have
    } finally {
      busy = false;
    }
  },
}));

/** The new-draw alert alone (Notifications screen). */
export function useDrawNotifications() {
  const draws = usePushPrefs((s) => s.prefs.draws);
  const loading = usePushPrefs((s) => s.loading);
  const set = usePushPrefs((s) => s.set);
  return { enabled: draws, loading, toggle: () => set({ draws: !draws }) };
}
