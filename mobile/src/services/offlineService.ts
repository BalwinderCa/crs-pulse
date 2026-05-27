import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { STORAGE_KEYS } from '@/constants';
import type { DashboardData, Draw, Analytics } from '@/types';

export async function isOnline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return state.isConnected === true && state.isInternetReachable !== false;
}

export async function getCachedDashboard(): Promise<DashboardData | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.DASHBOARD_CACHE);
  return raw ? JSON.parse(raw) : null;
}

export async function getCachedDraws(): Promise<Draw[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.DRAWS_CACHE);
  return raw ? JSON.parse(raw) : [];
}

export async function getCachedAnalytics(): Promise<Analytics | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.ANALYTICS_CACHE);
  return raw ? JSON.parse(raw) : null;
}

export async function clearAllCache(): Promise<void> {
  await AsyncStorage.multiRemove([
    STORAGE_KEYS.DRAWS_CACHE,
    STORAGE_KEYS.DASHBOARD_CACHE,
    STORAGE_KEYS.ANALYTICS_CACHE,
  ]);
}
