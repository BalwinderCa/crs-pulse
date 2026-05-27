import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS } from '@/constants';
import type { ApiError } from '@/types';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:8000/api/v1';

export const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-App-Version': '1.0.0',
  },
});

// ─── Request interceptor ─────────────────────────────────────────────────────

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await SecureStore.getItemAsync(STORAGE_KEYS.AUTH_TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ─── Response interceptor ────────────────────────────────────────────────────

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error.response?.status;

    if (status === 401) {
      await SecureStore.deleteItemAsync(STORAGE_KEYS.AUTH_TOKEN);
      // Auth store will detect missing token on next query
    }

    const apiError: ApiError = {
      message:
        (error.response?.data as Record<string, string>)?.message ??
        error.message ??
        'An unexpected error occurred',
      errors: (error.response?.data as Record<string, string[]>)?.errors,
      status: status ?? 0,
    };

    return Promise.reject(apiError);
  },
);

export default apiClient;
