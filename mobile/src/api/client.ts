import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import * as Device from 'expo-device';
import { STORAGE_KEYS } from '@/constants';
import type { ApiError } from '@/types';

// Physical device uses network IP (.env); simulator uses nginx proxy on :8080
// (Laravel binds to 127.0.0.1:8000 only; nginx on 0.0.0.0:8080 is the public-facing proxy)
const BASE_URL = (Device.isDevice
  ? process.env.EXPO_PUBLIC_API_URL
  : 'http://localhost:8080/api/v1'
) ?? 'http://localhost:8080/api/v1';

export const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-App-Version': '1.0.0',
  },
});

const KEYCHAIN_OPTS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED,
};

// In-memory token cache — set by authStore so interceptor doesn't
// need SecureStore (which can fail on simulator keychain issues).
let _memoryToken: string | null = null;
export function setMemoryToken(token: string | null) {
  _memoryToken = token;
}

// ─── Request interceptor ─────────────────────────────────────────────────────

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Prefer in-memory token (set by authStore on login/initialize).
    // Fall back to SecureStore in case app was restarted and memory cleared.
    let token = _memoryToken;
    if (!token) {
      try {
        token = await SecureStore.getItemAsync(STORAGE_KEYS.AUTH_TOKEN, KEYCHAIN_OPTS);
      } catch {
        token = null;
      }
    }
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
      _memoryToken = null;
      try { await SecureStore.deleteItemAsync(STORAGE_KEYS.AUTH_TOKEN, KEYCHAIN_OPTS); } catch {}
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
