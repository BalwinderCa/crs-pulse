import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/constants';
import { useProfileStore } from '@/store/profileStore';
import { useApplicationStore } from '@/store/applicationStore';
import { useTimelineStore } from '@/store/timelineStore';
import { useNotificationsStore } from '@/features/notifications/store/notificationsStore';
import { unregisterPushNotifications } from '@/services/pushService';
import { deleteTrialRecord } from '@/services/trialService';

/**
 * Wipes ALL user data, on-device and off:
 *   - profile, calculator inputs, tracked application, timeline milestones,
 *     document-checklist progress, notification state (on-device);
 *   - the push registration (revoked server-side, best-effort);
 *   - the server-side free-trial record keyed to the device id (DELETE /trial),
 *     so no off-device identifier survives a reset — satisfying the privacy
 *     policy's deletion promise and store data-deletion requirements.
 *
 * The paid entitlement flag is intentionally NOT cleared: it is a purchase, not
 * personal data, and Google Play remains its source of truth (restored on next
 * launch). Each step is independently guarded — one failure must not abort the rest.
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
    // Erases the off-device trial record (best-effort; self-expires via TTL too).
    deleteTrialRecord(),
  ]);

  // Remaining raw AsyncStorage keys with no dedicated store action.
  await AsyncStorage.multiRemove([
    STORAGE_KEYS.DOC_CHECKLIST,
    STORAGE_KEYS.LAST_SEEN_DRAW,
    STORAGE_KEYS.DRAW_NOTIFICATIONS,
    STORAGE_KEYS.TRIAL_START,
    STORAGE_KEYS.TRIAL_INTRO_SEEN,
  ]).catch(() => {});
}
