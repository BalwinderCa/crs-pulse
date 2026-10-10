import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/constants';
import { useProfileStore } from '@/store/profileStore';
import { useApplicationStore } from '@/store/applicationStore';
import { useCalculatorsStore } from '@/store/calculatorsStore';
import { useTimelineStore } from '@/store/timelineStore';
import { useNotificationsStore } from '@/features/notifications/store/notificationsStore';
import { unregisterPushNotifications } from '@/services/pushService';

/**
 * Wipes ALL user data, on-device and off:
 *   - profile, calculator inputs, tracked application, timeline milestones,
 *     document-checklist progress, notification state (on-device);
 *   - the push registration (revoked server-side, best-effort).
 *
 * The app stores no other off-device identifier (the anonymous push token is the
 * only thing that ever leaves the device, and it's revoked above).
 * Each step is independently guarded — one failure must not abort the rest.
 * Every step still runs, and the promise then rejects if the push revoke or
 * the raw key removal failed, so the caller can tell the user to retry. (A
 * failed revoke keeps the token on-device, so a retry revokes it.)
 */
export async function resetAllData(): Promise<void> {
  // In-memory store state (also persists defaults / removes keys).
  const results = await Promise.allSettled([
    useProfileStore.getState().reset(),
    useApplicationStore.getState().clear(),
    useCalculatorsStore.getState().clear(),
    useTimelineStore.getState().clearAll(),
    useNotificationsStore.getState().clear(),
    // Revokes the token server-side and removes it locally.
    unregisterPushNotifications(),
  ]);
  const revoke = results[results.length - 1];
  let failed = results.some((r) => r.status === 'rejected')
    || (revoke?.status === 'fulfilled' && revoke.value === false);

  // Remaining raw AsyncStorage keys with no dedicated store action.
  await AsyncStorage.multiRemove([
    STORAGE_KEYS.DOC_CHECKLIST,
    STORAGE_KEYS.LAST_SEEN_DRAW,
    STORAGE_KEYS.DRAW_NOTIFICATIONS,
  ]).catch(() => { failed = true; });

  if (failed) throw new Error('resetAllData: some steps failed');
}
