import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/constants';
import { resolveEasProjectId } from '@/utils/easConfig';
import { recordPositiveMoment } from '@/services/reviewPrompt';
import { track } from '@/services/analyticsService';

function getPushUrl(): string | null {
  const url = process.env.EXPO_PUBLIC_PUSH_URL?.replace(/\/$/, '');
  return url || null;
}

/** Headers for push worker API calls (includes optional Bearer auth). */
export function buildPushHeaders(apiKey?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  const key = (apiKey ?? process.env.EXPO_PUBLIC_PUSH_API_KEY)?.trim();
  if (key) {
    headers.Authorization = `Bearer ${key}`;
  }
  return headers;
}

async function getExpoPushToken(): Promise<string | null> {
  if (!Device.isDevice) return null;

  const projectId = resolveEasProjectId(
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId,
  );

  if (!projectId) {
    if (__DEV__) {
      console.warn(
        'EAS project ID not configured — set EAS_PROJECT_ID in .env.local or run eas init',
      );
    }
    return null;
  }

  const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
  return data ?? null;
}

export type PushRegisterFailure =
  | 'simulator'
  | 'expo_go'
  | 'not_configured'
  | 'permission_denied'
  | 'token_failed'
  | 'server_error';

export type PushRegisterResult = { ok: true } | { ok: false; reason: PushRegisterFailure };

export async function registerForPushNotifications(): Promise<PushRegisterResult> {
  if (!Device.isDevice) return { ok: false, reason: 'simulator' };

  // Expo Go cannot receive remote push notifications (SDK 53+)
  if (Constants.executionEnvironment === 'storeClient') {
    return { ok: false, reason: 'expo_go' };
  }

  const pushUrl = getPushUrl();
  if (!pushUrl) {
    if (__DEV__) console.warn('EXPO_PUBLIC_PUSH_URL not set — push registration skipped');
    return { ok: false, reason: 'not_configured' };
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let granted = existing === 'granted';

  if (!granted) {
    const { status } = await Notifications.requestPermissionsAsync();
    granted = status === 'granted';
  }

  if (!granted) return { ok: false, reason: 'permission_denied' };

  try {
    const token = await getExpoPushToken();
    if (!token) return { ok: false, reason: 'token_failed' };

    await AsyncStorage.setItem(STORAGE_KEYS.PUSH_TOKEN, token);

    const res = await fetch(`${pushUrl}/register`, {
      method: 'POST',
      headers: buildPushHeaders(),
      body: JSON.stringify({
        token,
        platform: Platform.OS === 'ios' ? 'ios' : 'android',
      }),
    });

    if (!res.ok) {
      if (__DEV__) console.warn('Push register failed:', res.status);
      return { ok: false, reason: 'server_error' };
    }

    return { ok: true };
  } catch (err) {
    if (__DEV__) console.warn('Push registration failed:', err);
    return { ok: false, reason: 'server_error' };
  }
}

export async function unregisterPushNotifications(): Promise<boolean> {
  const pushUrl = getPushUrl();
  if (!pushUrl) return true;

  try {
    const token = await AsyncStorage.getItem(STORAGE_KEYS.PUSH_TOKEN);
    if (token) {
      await fetch(`${pushUrl}/revoke`, {
        method: 'DELETE',
        headers: buildPushHeaders(),
        body: JSON.stringify({ token }),
      });
      await AsyncStorage.removeItem(STORAGE_KEYS.PUSH_TOKEN);
    }
    return true;
  } catch (err) {
    if (__DEV__) console.warn('Push unregister failed:', err);
    return false;
  }
}


export type PushHandlers = {
  onNewDraw: () => void;
  onProcessingTimes: () => void;
};

/**
 * Routes an incoming push to the store that has to refetch. Both listeners and
 * the cold-start path funnel through here so a new push type only needs adding
 * once.
 */
function dispatch(type: unknown, handlers: PushHandlers): void {
  if (type === 'new_draw') handlers.onNewDraw();
  else if (type === 'processing_times') handlers.onProcessingTimes();
}

// expo-notifications' DEFAULT_ACTION_IDENTIFIER: the user tapped the alert itself.
const DEFAULT_ACTION = 'expo.modules.notifications.actions.DEFAULT';
const KNOWN_TYPES = ['new_draw', 'processing_times', 'app_update'] as const;

type TapResponse = {
  actionIdentifier?: string;
  notification: { request: { identifier?: string; content: { data?: Record<string, unknown> | null } } };
};

/**
 * Records a tap on a push as `push_opened`. Only the push type and the public
 * draw number are sent. `seen` holds identifiers already counted, because on a
 * cold start both the listener and getLastNotificationResponseAsync can
 * deliver the same tap.
 */
function trackOpened(response: TapResponse, seen: Set<string>): void {
  if (response.actionIdentifier && response.actionIdentifier !== DEFAULT_ACTION) return;
  const id = response.notification.request.identifier;
  if (id) {
    if (seen.has(id)) return;
    seen.add(id);
  }
  const data = response.notification.request.content.data ?? {};
  const type = (KNOWN_TYPES as readonly unknown[]).includes(data.type)
    ? (data.type as (typeof KNOWN_TYPES)[number])
    : 'other';
  const drawNumber = Number(data.draw_number);
  if (type === 'new_draw' && Number.isInteger(drawNumber)) {
    track('push_opened', { type, draw_number: drawNumber });
    // Counted but never asked here: the app is still opening from the tap.
    void recordPositiveMoment({ ask: false });
  } else {
    track('push_opened', { type });
  }
}

export function setupPushListeners(handlers: PushHandlers): () => void {
  const seen = new Set<string>();
  const foregroundSub = Notifications.addNotificationReceivedListener((notification) => {
    dispatch(notification.request.content.data?.type, handlers);
  });

  const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
    trackOpened(response, seen);
    dispatch(response.notification.request.content.data?.type, handlers);
  });

  // Tapping a push from a COLD start delivers the response before these
  // listeners exist, so without this the launch that matters most refetches
  // nothing. Cleared after handling so it fires once, not on every later boot.
  let cancelled = false;
  Notifications.getLastNotificationResponseAsync()
    .then(async (response) => {
      if (cancelled || !response) return;
      trackOpened(response, seen);
      dispatch(response.notification.request.content.data?.type, handlers);
      await Notifications.clearLastNotificationResponseAsync().catch(() => {});
    })
    .catch(() => {});

  return () => {
    cancelled = true;
    foregroundSub.remove();
    responseSub.remove();
  };
}
