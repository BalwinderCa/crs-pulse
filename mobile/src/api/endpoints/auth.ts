import apiClient from '../client';
import type {
  AuthResponse,
  LoginPayload,
  RegisterPayload,
  ApiResponse,
} from '@/types';

export const authApi = {
  login: (payload: LoginPayload) =>
    apiClient.post<ApiResponse<AuthResponse>>('/auth/login', payload),

  register: (payload: RegisterPayload) =>
    apiClient.post<ApiResponse<AuthResponse>>('/auth/register', payload),

  logout: () => apiClient.post<void>('/auth/logout'),

  me: () => apiClient.get<ApiResponse<AuthResponse['user']>>('/auth/me'),

  forgotPassword: (email: string) =>
    apiClient.post<ApiResponse<{ message: string }>>('/auth/forgot-password', { email }),

  resetPassword: (payload: {
    token: string;
    email: string;
    password: string;
    password_confirmation: string;
  }) => apiClient.post<ApiResponse<{ message: string }>>('/auth/reset-password', payload),

  googleLogin: (payload: { id_token: string; device_name: string }) =>
    apiClient.post<ApiResponse<AuthResponse>>('/auth/google', payload),

  appleLogin: (payload: {
    identity_token: string;
    nonce: string;
    full_name?: string | null;
    device_name: string;
  }) => apiClient.post<ApiResponse<AuthResponse>>('/auth/apple', payload),
};
