import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Device from 'expo-device';
import Toast from 'react-native-toast-message';
import { authApi } from '@/api';
import { useAuthStore } from '@/store/authStore';
import type { LoginPayload, RegisterPayload } from '@/types';

function getDeviceName(): string {
  return `${Device.brand ?? 'Unknown'} ${Device.modelName ?? 'Device'}`;
}

export function useLogin() {
  const { setAuth } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Omit<LoginPayload, 'device_name'>) =>
      authApi.login({ ...payload, device_name: getDeviceName() }),
    onSuccess: async (res) => {
      const { user, token } = res.data.data;
      await setAuth(user, token);
      queryClient.invalidateQueries();
    },
    onError: (err: { message: string }) => {
      Toast.show({ type: 'error', text1: 'Login Failed', text2: err.message });
    },
  });
}

export function useRegister() {
  const { setAuth } = useAuthStore();

  return useMutation({
    mutationFn: (payload: Omit<RegisterPayload, 'device_name'>) =>
      authApi.register({ ...payload, device_name: getDeviceName() }),
    onSuccess: async (res) => {
      const { user, token } = res.data.data;
      await setAuth(user, token);
    },
    onError: (err: { message: string }) => {
      Toast.show({ type: 'error', text1: 'Registration Failed', text2: err.message });
    },
  });
}

export function useLogout() {
  const { clearAuth } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: async () => {
      await clearAuth();
      queryClient.clear();
    },
  });
}

export function useGoogleLogin() {
  const { setAuth } = useAuthStore();

  return useMutation({
    mutationFn: (idToken: string) =>
      authApi.googleLogin({ id_token: idToken, device_name: getDeviceName() }),
    onSuccess: async (res) => {
      const { user, token } = res.data.data;
      await setAuth(user, token);
    },
    onError: (err: { message: string }) => {
      Toast.show({ type: 'error', text1: 'Google Login Failed', text2: err.message });
    },
  });
}

export function useAppleLogin() {
  const { setAuth } = useAuthStore();

  return useMutation({
    mutationFn: (payload: { identity_token: string; nonce: string; full_name?: string | null }) =>
      authApi.appleLogin({ ...payload, device_name: getDeviceName() }),
    onSuccess: async (res) => {
      const { user, token } = res.data.data;
      await setAuth(user, token);
    },
    onError: (err: { message: string }) => {
      Toast.show({ type: 'error', text1: 'Apple Login Failed', text2: err.message });
    },
  });
}
