import apiClient from '../client';
import type { UserProfile, UpdateProfilePayload, ApiResponse } from '@/types';

export const profileApi = {
  get: () => apiClient.get<ApiResponse<UserProfile>>('/profile'),

  update: (payload: UpdateProfilePayload) =>
    apiClient.put<ApiResponse<UserProfile>>('/profile', payload),

  delete: () => apiClient.delete<void>('/profile'),
};
