import { Alert } from 'react-native';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDrawNotifications } from '@/hooks/useDrawNotifications';
import { registerForPushNotifications, unregisterPushNotifications } from '@/services/pushService';
import { STORAGE_KEYS } from '@/constants';

jest.mock('@/services/pushService', () => ({
  registerForPushNotifications: jest.fn(),
  unregisterPushNotifications: jest.fn(),
}));
jest.mock('@/services/analyticsService', () => ({ track: jest.fn() }));

const register = registerForPushNotifications as jest.Mock;
const unregister = unregisterPushNotifications as jest.Mock;

/** A promise the test resolves by hand, to observe state while the network call is in flight. */
function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => { resolve = r; });
  return { promise, resolve };
}

describe('useDrawNotifications.toggle', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  async function mount() {
    const hook = renderHook(() => useDrawNotifications());
    await waitFor(() => expect(hook.result.current.loading).toBe(false));
    return hook;
  }

  it('flips on immediately, before registration finishes', async () => {
    const pending = deferred<{ ok: true }>();
    register.mockReturnValue(pending.promise);
    const { result } = await mount();

    let done!: Promise<void>;
    act(() => { done = result.current.toggle(); });
    expect(result.current.enabled).toBe(true); // no wait for the network

    await act(async () => { pending.resolve({ ok: true }); await done; });
    expect(result.current.enabled).toBe(true);
    expect(await AsyncStorage.getItem(STORAGE_KEYS.DRAW_NOTIFICATIONS)).toBe('true');
  });

  it('flips back and explains when enabling fails', async () => {
    register.mockResolvedValue({ ok: false, reason: 'permission_denied' });
    const { result } = await mount();

    await act(async () => { await result.current.toggle(); });
    expect(result.current.enabled).toBe(false);
    expect(Alert.alert).toHaveBeenCalled();
    expect(await AsyncStorage.getItem(STORAGE_KEYS.DRAW_NOTIFICATIONS)).toBeNull();
  });

  it('flips off immediately and revokes in the background', async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.DRAW_NOTIFICATIONS, 'true');
    register.mockResolvedValue({ ok: true });
    const pending = deferred<void>();
    unregister.mockReturnValue(pending.promise);
    const { result } = await mount();
    expect(result.current.enabled).toBe(true);

    let done!: Promise<void>;
    act(() => { done = result.current.toggle(); });
    expect(result.current.enabled).toBe(false);

    await act(async () => { pending.resolve(); await done; });
    expect(await AsyncStorage.getItem(STORAGE_KEYS.DRAW_NOTIFICATIONS)).toBe('false');
  });

  it('ignores a second tap while the first is still in flight', async () => {
    const pending = deferred<{ ok: true }>();
    register.mockReturnValue(pending.promise);
    const { result } = await mount();

    let first!: Promise<void>;
    act(() => { first = result.current.toggle(); });
    await act(async () => { await result.current.toggle(); });
    expect(register).toHaveBeenCalledTimes(1);
    expect(unregister).not.toHaveBeenCalled();

    await act(async () => { pending.resolve({ ok: true }); await first; });
    expect(result.current.enabled).toBe(true);
  });
});
