import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/constants';

function getPushUrl(): string | null {
  const url = process.env.EXPO_PUBLIC_PUSH_URL?.replace(/\/$/, '');
  return url || null;
}

async function getExpoPushToken(): Promise<string | null> {
  if (!Device.isDevice) return null;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  if (!projectId) {
    console.warn('Expo projectId missing — push token unavailable');
    return null;
  }

  const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
  return data ?? null;
}

export async function registerForPushNotifications(): Promise<boolean> {
  if (!Device.isDevice) return false;

  const pushUrl = getPushUrl();
  if (!pushUrl) {
    console.warn('EXPO_PUBLIC_PUSH_URL not set — push registration skipped');
    return false;
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let granted = existing === 'granted';

  if (!granted) {
    const { status } = await Notifications.requestPermissionsAsync();
    granted = status === 'granted';
  }

  if (!granted) return false;

  try {
    const token = await getExpoPushToken();
    if (!token) return false;

    await AsyncStorage.setItem(STORAGE_KEYS.PUSH_TOKEN, token);

    const res = await fetch(`${pushUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        token,
        platform: Platform.OS === 'ios' ? 'ios' : 'android',
      }),
    });

    if (!res.ok) {
      console.warn('Push register failed:', res.status);
      return false;
    }

    return true;
  } catch (err) {
    console.warn('Push registration failed:', err);
    return false;
  }
}

export async function unregisterPushNotifications(): Promise<void> {
  const pushUrl = getPushUrl();
  if (!pushUrl) return;

  try {
    const token = await AsyncStorage.getItem(STORAGE_KEYS.PUSH_TOKEN);
    if (token) {
      await fetch(`${pushUrl}/revoke`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ token }),
      });
      await AsyncStorage.removeItem(STORAGE_KEYS.PUSH_TOKEN);
    }
  } catch (err) {
    console.warn('Push unregister failed:', err);
  }
}

export function setupPushListeners(onNewDraw: () => void): () => void {
  const foregroundSub = Notifications.addNotificationReceivedListener((notification) => {
    const type = notification.request.content.data?.type;
    if (type === 'new_draw') onNewDraw();
  });

  const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
    const type = response.notification.request.content.data?.type;
    if (type === 'new_draw') onNewDraw();
  });

  return () => {
    foregroundSub.remove();
    responseSub.remove();
  };
}
