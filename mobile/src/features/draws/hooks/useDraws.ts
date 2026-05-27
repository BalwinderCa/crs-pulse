import { useInfiniteQuery } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { drawsApi } from '@/api';
import { API_CACHE_KEYS, PAGINATION_LIMIT, QUERY_STALE_TIMES, STORAGE_KEYS } from '@/constants';
import type { Draw, DrawFilter } from '@/types';

type Params = {
  filter?: DrawFilter;
  category?: string;
};

export function useDraws({ filter, category }: Params = {}) {
  return useInfiniteQuery({
    queryKey: [API_CACHE_KEYS.DRAWS, filter, category],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await drawsApi.list({
        filter,
        category,
        page: pageParam,
        per_page: PAGINATION_LIMIT,
      });

      // Cache first page for offline
      if (pageParam === 1) {
        await AsyncStorage.setItem(
          STORAGE_KEYS.DRAWS_CACHE,
          JSON.stringify(res.data.data),
        );
      }

      return res.data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { current_page, last_page } = lastPage.meta;
      return current_page < last_page ? current_page + 1 : undefined;
    },
    staleTime: QUERY_STALE_TIMES.DRAWS,
  });
}

export function useAllDrawItems(params: Params = {}): Draw[] {
  const { data } = useDraws(params);
  return data?.pages.flatMap((p) => p.data) ?? [];
}
