import { useQuery } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { dashboardApi } from '@/api';
import { API_CACHE_KEYS, QUERY_STALE_TIMES, STORAGE_KEYS } from '@/constants';
import type { DashboardData } from '@/types';

export function useDashboard() {
  return useQuery({
    queryKey: [API_CACHE_KEYS.DASHBOARD],
    queryFn: async () => {
      const res = await dashboardApi.get();
      const data = res.data.data as DashboardData;
      // Persist for offline
      await AsyncStorage.setItem(STORAGE_KEYS.DASHBOARD_CACHE, JSON.stringify(data));
      return data;
    },
    staleTime: QUERY_STALE_TIMES.DASHBOARD,
    placeholderData: async () => {
      const cached = await AsyncStorage.getItem(STORAGE_KEYS.DASHBOARD_CACHE);
      return cached ? (JSON.parse(cached) as DashboardData) : undefined;
    },
  });
}
