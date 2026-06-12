import { useCallback, useEffect, useState } from 'react';
import { Alert, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { STORAGE_KEYS } from '@/constants';
import {
  registerForPushNotifications,
  unregisterPushNotifications,
  type PushRegisterFailure,
} from '@/services/pushService';

const FAILURE_MESSAGES: Record<PushRegisterFailure, string> = {
  simulator:         'Push notifications are not available on simulators. Try a physical device.',
  expo_go:           'Push notifications are not supported in Expo Go. Use a development or production build.',
  not_configured:    'Push notifications are not configured for this build.',
  permission_denied: 'Notifications are disabled for this app. Enable them in your device settings to receive draw alerts.',
  token_failed:      'Could not register this device for notifications. Please try again later.',
  server_error:      'Could not reach the notification service. Check your connection and try again.',
};

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
      const result = await registerForPushNotifications();
      if (!result.ok) {
        if (result.reason === 'permission_denied') {
          Alert.alert('Notifications Disabled', FAILURE_MESSAGES.permission_denied, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]);
        } else {
          Alert.alert('Notifications Unavailable', FAILURE_MESSAGES[result.reason]);
        }
        return;
      }
    } else {
      await unregisterPushNotifications();
    }
    const next = !enabled;
    setEnabled(next);
    await AsyncStorage.setItem(STORAGE_KEYS.DRAW_NOTIFICATIONS, next ? 'true' : 'false');
  }, [enabled]);

  return { enabled, loading, toggle };
}
