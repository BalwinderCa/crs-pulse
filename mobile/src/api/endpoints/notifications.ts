import apiClient from '../client';
import type {
  NotificationsResponse,
  AppNotification,
  DeviceTokenPayload,
  ApiResponse,
} from '@/types';

export const notificationsApi = {
  list: (params?: { page?: number; per_page?: number }) =>
    apiClient.get<NotificationsResponse>('/notifications', { params }),

  markRead: (id: number) =>
    apiClient.patch<ApiResponse<AppNotification>>(`/notifications/${id}/read`),

  markAllRead: () =>
    apiClient.post<ApiResponse<{ message: string }>>('/notifications/read-all'),

  registerToken: (payload: DeviceTokenPayload) =>
    apiClient.post<ApiResponse<{ message: string }>>('/notifications/token', payload),

  revokeToken: (token: string) =>
    apiClient.delete<ApiResponse<{ message: string }>>('/notifications/token', {
      data: { token },
    }),
};
