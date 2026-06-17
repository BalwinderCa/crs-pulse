import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/constants';
import { useProfileStore } from '@/store/profileStore';
import { useApplicationStore } from '@/store/applicationStore';
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
 * only thing that ever leaves the device, and it's revoked above). The paid
 * entitlement flag is intentionally NOT cleared: it is a purchase, not personal
 * data, and Google Play remains its source of truth (restored on next launch).
 * Each step is independently guarded — one failure must not abort the rest.
 */
export async function resetAllData(): Promise<void> {
  // In-memory store state (also persists defaults / removes keys).
  await Promise.allSettled([
    useProfileStore.getState().reset(),
    useApplicationStore.getState().clear(),
    useTimelineStore.getState().clearAll(),
    useNotificationsStore.getState().clear(),
    // Revokes the token server-side and removes it locally.
    unregisterPushNotifications(),
  ]);

  // Remaining raw AsyncStorage keys with no dedicated store action.
  await AsyncStorage.multiRemove([
    STORAGE_KEYS.DOC_CHECKLIST,
    STORAGE_KEYS.LAST_SEEN_DRAW,
    STORAGE_KEYS.DRAW_NOTIFICATIONS,
  ]).catch(() => {});
}
