import { renderHook, act } from '@testing-library/react-native';
import { useAuthStore } from '../../src/store/authStore';

// Mock SecureStore
jest.mock('expo-secure-store', () => ({
  setItemAsync:    jest.fn(),
  deleteItemAsync: jest.fn(),
  getItemAsync:    jest.fn().mockResolvedValue(null),
}));

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, token: null, isAuthenticated: false, isInitialized: false });
  });

  it('starts unauthenticated', () => {
    const { result } = renderHook(() => useAuthStore());
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('setAuth sets user and token', async () => {
    const { result } = renderHook(() => useAuthStore());
    const mockUser = { id: 1, email: 'test@example.com', name: 'Test', email_verified_at: null, created_at: '' };

    await act(async () => {
      await result.current.setAuth(mockUser, 'mock-token');
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.token).toBe('mock-token');
  });

  it('clearAuth removes user and token', async () => {
    const { result } = renderHook(() => useAuthStore());
    const mockUser = { id: 1, email: 'test@example.com', name: 'Test', email_verified_at: null, created_at: '' };

    await act(async () => {
      await result.current.setAuth(mockUser, 'mock-token');
      await result.current.clearAuth();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('initialize reads token from SecureStore', async () => {
    const SecureStore = require('expo-secure-store');
    SecureStore.getItemAsync.mockResolvedValueOnce('existing-token');

    const { result } = renderHook(() => useAuthStore());

    await act(async () => {
      await result.current.initialize();
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isInitialized).toBe(true);
  });
});
