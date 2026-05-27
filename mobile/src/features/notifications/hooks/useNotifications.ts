import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '@/api';
import { API_CACHE_KEYS, PAGINATION_LIMIT, QUERY_STALE_TIMES } from '@/constants';
import { useNotificationStore } from '@/store/notificationStore';
import type { AppNotification } from '@/types';

export function useNotificationsList() {
  return useInfiniteQuery({
    queryKey: [API_CACHE_KEYS.NOTIFICATIONS],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await notificationsApi.list({ page: pageParam, per_page: PAGINATION_LIMIT });
      return res.data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { current_page, last_page } = lastPage.meta;
      return current_page < last_page ? current_page + 1 : undefined;
    },
    staleTime: QUERY_STALE_TIMES.NOTIFICATIONS,
    select: (data) => ({
      ...data,
      unreadCount: data.pages[0]?.unread_count ?? 0,
    }),
  });
}

export function useMarkRead() {
  const queryClient = useQueryClient();
  const { decrementUnread } = useNotificationStore();

  return useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id as unknown as number),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_CACHE_KEYS.NOTIFICATIONS] });
      decrementUnread();
    },
  });
}

export function useMarkAllRead() {
  const queryClient = useQueryClient();
  const { clearUnread } = useNotificationStore();

  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_CACHE_KEYS.NOTIFICATIONS] });
      clearUnread();
    },
  });
}

export function useAllNotificationItems(): AppNotification[] {
  const { data } = useNotificationsList();
  return data?.pages.flatMap((p) => p.data) ?? [];
}
