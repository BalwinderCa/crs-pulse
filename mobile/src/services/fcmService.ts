import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { notificationsApi } from '@/api';
import { useNotificationStore } from '@/store/notificationStore';
import { STORAGE_KEYS } from '@/constants';
import * as SecureStore from 'expo-secure-store';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert:   true,
    shouldPlaySound:   true,
    shouldSetBadge:    true,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  if (!Device.isDevice) return false;

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function registerFCMToken(): Promise<string | null> {
  try {
    const granted = await requestNotificationPermission();
    if (!granted) return null;

    // expo-notifications handles APNs (iOS) and FCM (Android) via Expo push service
    const tokenData = await Notifications.getExpoPushTokenAsync();
    const pushToken = tokenData.data;

    if (pushToken) {
      useNotificationStore.getState().setFcmToken(pushToken);
      await SecureStore.setItemAsync(STORAGE_KEYS.FCM_TOKEN, pushToken);

      await notificationsApi.registerToken({
        token:    pushToken,
        platform: Platform.OS as 'android' | 'ios',
      });
    }

    return pushToken;
  } catch (err) {
    console.warn('Push token registration failed:', err);
    return null;
  }
}

export function setupFCMListeners(onNotification: (data: Record<string, string>) => void) {
  // Foreground notifications
  const foregroundSub = Notifications.addNotificationReceivedListener((notification) => {
    const data = (notification.request.content.data ?? {}) as Record<string, string>;
    onNotification(data);
  });

  // Tap on notification (app in background/killed)
  const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = (response.notification.request.content.data ?? {}) as Record<string, string>;
    onNotification(data);
  });

  return () => {
    foregroundSub.remove();
    responseSub.remove();
  };
}

export async function revokeFCMToken(): Promise<void> {
  const token = await SecureStore.getItemAsync(STORAGE_KEYS.FCM_TOKEN);
  if (token) {
    await notificationsApi.revokeToken(token);
    await SecureStore.deleteItemAsync(STORAGE_KEYS.FCM_TOKEN);
  }
}
