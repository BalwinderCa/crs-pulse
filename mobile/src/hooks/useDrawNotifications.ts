import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { STORAGE_KEYS } from '@/constants';
import { registerForPushNotifications, unregisterPushNotifications } from '@/services/pushService';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  false,
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

export function useDrawNotifications() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEYS.DRAW_NOTIFICATIONS)
      .then(async (v) => {
        const isEnabled = v === 'true';
        setEnabled(isEnabled);
        if (isEnabled) await registerForPushNotifications();
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggle = useCallback(async () => {
    if (!enabled) {
      const ok = await registerForPushNotifications();
      if (!ok) return;
    } else {
      await unregisterPushNotifications();
    }
    const next = !enabled;
    setEnabled(next);
    await AsyncStorage.setItem(STORAGE_KEYS.DRAW_NOTIFICATIONS, next ? 'true' : 'false');
  }, [enabled]);

  return { enabled, loading, toggle };
}
