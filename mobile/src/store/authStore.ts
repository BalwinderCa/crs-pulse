import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import * as Device from 'expo-device';
import { STORAGE_KEYS } from '@/constants';
import { setMemoryToken } from '@/api/client';
import type { AuthUser } from '@/types';

const KEYCHAIN_OPTS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED,
};

const DEV_EMAIL    = 'test@crspulse.ca';
const DEV_PASSWORD = 'password';

// Physical device uses network IP (from .env); simulator uses localhost directly
// Device.isDevice is false on simulator, true on real hardware
const API_BASE = (Device.isDevice
  ? process.env.EXPO_PUBLIC_API_URL
  : 'http://localhost:8000/api/v1'
) ?? 'http://localhost:8000/api/v1';

type AuthState = {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
};

type AuthActions = {
  setAuth: (user: AuthUser, token: string) => Promise<void>;
  clearAuth: () => Promise<void>;
  initialize: () => Promise<void>;
};

export const useAuthStore = create<AuthState & AuthActions>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isInitialized: false,

  setAuth: async (user, token) => {
    setMemoryToken(token);                    // ← interceptor uses this immediately
    try {
      await SecureStore.setItemAsync(STORAGE_KEYS.AUTH_TOKEN, token, KEYCHAIN_OPTS);
    } catch (e) {
      console.warn('SecureStore.setItemAsync failed — in-memory only', e);
    }
    set({ user, token, isAuthenticated: true });
  },

  clearAuth: async () => {
    setMemoryToken(null);
    try {
      await SecureStore.deleteItemAsync(STORAGE_KEYS.AUTH_TOKEN, KEYCHAIN_OPTS);
    } catch {}
    set({ user: null, token: null, isAuthenticated: false });
  },

  initialize: async () => {
    try {
      let token: string | null = null;
      let user: AuthUser | null = null;

      try {
        token = await SecureStore.getItemAsync(STORAGE_KEYS.AUTH_TOKEN, KEYCHAIN_OPTS);
      } catch {
        token = null;
      }

      // Dev auto-login: skip login screen during development
      if (!token && __DEV__) {
        try {
          const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({
              email: DEV_EMAIL,
              password: DEV_PASSWORD,
              device_name: 'Simulator Dev',
            }),
          });
          const json = await res.json();
          token = json?.data?.token ?? null;
          user  = json?.data?.user  ?? null;
          if (token) {
            setMemoryToken(token);            // ← set BEFORE any queries fire
            try {
              await SecureStore.setItemAsync(STORAGE_KEYS.AUTH_TOKEN, token, KEYCHAIN_OPTS);
            } catch {}
          }
        } catch (e) {
          console.warn('Dev auto-login failed (backend not running?)', e);
        }
      } else if (token) {
        setMemoryToken(token);
      }

      set({ user, token, isAuthenticated: !!token, isInitialized: true });
    } catch {
      set({ token: null, isAuthenticated: false, isInitialized: true });
    }
  },
}));
