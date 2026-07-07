import { useCallback, useEffect, useState } from 'react';
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

  const failureKey = useCallback((reason: PushRegisterFailure): string => {
    const map: Record<PushRegisterFailure, string> = {
      simulator: 'common.notifSimulator',
      expo_go: 'common.notifExpoGo',
      not_configured: 'common.notifNotConfigured',
      permission_denied: 'common.notifPermissionDenied',
      token_failed: 'common.notifTokenFailed',
      server_error: 'common.notifServerError',
    };
    return map[reason];
  }, []);

  const toggle = useCallback(async () => {
    if (!enabled) {
      const result = await registerForPushNotifications();
      if (!result.ok) {
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
    const next = !enabled;
    setEnabled(next);
    await AsyncStorage.setItem(STORAGE_KEYS.DRAW_NOTIFICATIONS, next ? 'true' : 'false');
  }, [enabled, failureKey]);

  return { enabled, loading, toggle };
}
