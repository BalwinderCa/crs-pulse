import apiClient from '../client';
import type { DrawsResponse, Draw, DrawFilter, ApiResponse } from '@/types';

export const drawsApi = {
  list: (params: {
    filter?: DrawFilter;
    category?: string;
    page?: number;
    per_page?: number;
  }) => apiClient.get<DrawsResponse>('/draws', { params }),

  get: (id: number) => apiClient.get<ApiResponse<Draw>>(`/draws/${id}`),

  latest: () => apiClient.get<ApiResponse<Draw>>('/draws/latest'),
};
