import apiClient from '../client';
import type { DashboardData, ApiResponse } from '@/types';

export const dashboardApi = {
  get: () => apiClient.get<ApiResponse<DashboardData>>('/dashboard'),
};
