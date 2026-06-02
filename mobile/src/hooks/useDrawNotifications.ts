import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { STORAGE_KEYS } from '@/constants';

// Ensure notifications show as banners while app is open
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  false,
  }),
});

async function requestPermission(): Promise<boolean> {
  const { status: current } = await Notifications.getPermissionsAsync();
  if (current === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function notifyNewDraw(drawNumber: number, cutoff: number, category: string) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `New Express Entry Draw #${drawNumber}`,
      body:  `${category} — Cutoff: ${cutoff} points`,
      sound: true,
      data:  { drawNumber },
    },
    trigger: null, // fire immediately
  });
}

// Called from drawsStore after a successful refresh
export async function checkAndNotifyNewDraw(draws: { draw_number: number; cutoff_score: number; category: string }[]) {
  try {
    const enabled = await AsyncStorage.getItem(STORAGE_KEYS.DRAW_NOTIFICATIONS);
    if (enabled !== 'true') return;

    const latestDraw = draws[0];
    if (!latestDraw) return;

    const lastSeenRaw = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SEEN_DRAW);
    const lastSeen    = lastSeenRaw ? parseInt(lastSeenRaw, 10) : 0;

    if (latestDraw.draw_number > lastSeen) {
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_SEEN_DRAW, String(latestDraw.draw_number));
      // Don't notify on first launch (lastSeen === 0) — just record the current draw
      if (lastSeen > 0) {
        await notifyNewDraw(latestDraw.draw_number, latestDraw.cutoff_score, latestDraw.category);
      }
    }
  } catch {}
}

export function useDrawNotifications() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEYS.DRAW_NOTIFICATIONS)
      .then((v) => setEnabled(v === 'true'))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggle = useCallback(async () => {
    if (!enabled) {
      const granted = await requestPermission();
      if (!granted) return; // user denied — don't enable
    }
    const next = !enabled;
    setEnabled(next);
    await AsyncStorage.setItem(STORAGE_KEYS.DRAW_NOTIFICATIONS, next ? 'true' : 'false');
  }, [enabled]);

  return { enabled, loading, toggle };
}
