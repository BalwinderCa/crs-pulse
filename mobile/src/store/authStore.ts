import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS } from '@/constants';
import { setMemoryToken } from '@/api/client';
import type { AuthUser } from '@/types';

const KEYCHAIN_OPTS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED,
};


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

      try {
        token = await SecureStore.getItemAsync(STORAGE_KEYS.AUTH_TOKEN, KEYCHAIN_OPTS);
      } catch {
        token = null;
      }

      if (token) {
        setMemoryToken(token);
      }

      set({ user: null, token, isAuthenticated: !!token, isInitialized: true });
    } catch {
      set({ token: null, isAuthenticated: false, isInitialized: true });
    }
  },
}));
