import apiClient from '../client';
import type { Analytics, ApiResponse, Category } from '@/types';

export const analyticsApi = {
  get: (params?: { category?: Category | 'all'; period?: 'all' | '1y' | '6m' | '3m' }) =>
    apiClient.get<ApiResponse<Analytics>>('/analytics', { params }),
};
