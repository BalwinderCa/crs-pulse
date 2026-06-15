import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/constants';
import { useProfileStore } from '@/store/profileStore';
import { useApplicationStore } from '@/store/applicationStore';
import { useTimelineStore } from '@/store/timelineStore';
import { useNotificationsStore } from '@/features/notifications/store/notificationsStore';
import { unregisterPushNotifications } from '@/services/pushService';

/**
 * Wipes ALL on-device user data — profile, calculator inputs, tracked
 * application, timeline milestones, document-checklist progress, notification
 * state, and the push registration (revoked server-side, best-effort).
 *
 * The "Reset All Data" button previously only reset the profile + tracked
 * application, silently leaving timeline milestones (with free-text notes),
 * checklist progress, and the registered push token behind. That contradicted
 * the privacy policy's promise that Reset clears local data. This is the single
 * source of truth for a full wipe so no store is forgotten.
 *
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
