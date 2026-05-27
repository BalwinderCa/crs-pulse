import { useQuery } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { analyticsApi } from '@/api';
import { API_CACHE_KEYS, QUERY_STALE_TIMES, STORAGE_KEYS } from '@/constants';
import type { Analytics, Category } from '@/types';

type Params = { category?: Category | 'all'; period?: 'all' | '1y' | '6m' | '3m' };

export function useAnalytics({ category = 'all', period = 'all' }: Params = {}) {
  return useQuery({
    queryKey: [API_CACHE_KEYS.ANALYTICS, category, period],
    queryFn: async () => {
      const res = await analyticsApi.get({ category, period });
      const data = res.data.data as Analytics;
      await AsyncStorage.setItem(STORAGE_KEYS.ANALYTICS_CACHE, JSON.stringify(data));
      return data;
    },
    staleTime: QUERY_STALE_TIMES.ANALYTICS,
  });
}
