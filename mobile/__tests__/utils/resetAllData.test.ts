import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/constants';
import { resetAllData } from '@/utils/resetAllData';
import { useProfileStore, DEFAULT_PROFILE } from '@/store/profileStore';
import { useApplicationStore } from '@/store/applicationStore';
import { useTimelineStore } from '@/store/timelineStore';
import { useNotificationsStore } from '@/features/notifications/store/notificationsStore';

// Avoid touching the network / Expo when revoking the push token.
jest.mock('@/services/pushService', () => ({
  unregisterPushNotifications: jest.fn().mockResolvedValue(undefined),
}));

const TIMELINE_KEY = 'timeline_milestones';

describe('resetAllData (H1) — full on-device wipe', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    // Seed every store/key a user could have populated.
    await AsyncStorage.multiSet([
      [STORAGE_KEYS.DOC_CHECKLIST, JSON.stringify({ docA: true })],
      [STORAGE_KEYS.LAST_SEEN_DRAW, '417'],
      [STORAGE_KEYS.DRAW_NOTIFICATIONS, 'true'],
    ]);
    await useApplicationStore.getState().save({ categoryId: 'cec', typeId: 'std', appliedDate: null });
    await useTimelineStore.getState().add({ type: 'ITA', date: '2026-01-01', note: 'secret note' });
    await useNotificationsStore.getState().markSeen(417);
  });

  it('clears every store and every personal AsyncStorage key', async () => {
    await resetAllData();

    // In-memory store state
    expect(useApplicationStore.getState().application).toBeNull();
    expect(useTimelineStore.getState().milestones).toHaveLength(0);
    expect(useNotificationsStore.getState().seenDraw).toBeNull();
    expect(useProfileStore.getState().profile).toEqual(DEFAULT_PROFILE);

    // Persisted keys
    const keys = [
      STORAGE_KEYS.TRACKED_APPLICATION,
      STORAGE_KEYS.NOTIFICATIONS_SEEN_DRAW,
      STORAGE_KEYS.DOC_CHECKLIST,
      STORAGE_KEYS.LAST_SEEN_DRAW,
      STORAGE_KEYS.DRAW_NOTIFICATIONS,
      TIMELINE_KEY,
    ];
    for (const k of keys) {
      expect(await AsyncStorage.getItem(k)).toBeNull();
    }
  });

  it('revokes the push token server-side', async () => {
    const { unregisterPushNotifications } = require('@/services/pushService');
    await resetAllData();
    expect(unregisterPushNotifications).toHaveBeenCalled();
  });
});
