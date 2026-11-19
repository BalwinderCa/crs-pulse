import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePushPrefs } from '@/hooks/useDrawNotifications';
import { registerForPushNotifications, unregisterPushNotifications } from '@/services/pushService';
import { useTimelineStore } from '@/store/timelineStore';
import { useProStore } from '@/store/proStore';
import { STORAGE_KEYS } from '@/constants';

jest.mock('@/services/pushService', () => ({
  registerForPushNotifications: jest.fn(),
  unregisterPushNotifications: jest.fn(),
}));
jest.mock('@/services/analyticsService', () => ({ track: jest.fn() }));

const register = registerForPushNotifications as jest.Mock;
const unregister = unregisterPushNotifications as jest.Mock;
const prefs = () => usePushPrefs.getState().prefs;
const set = (c: Parameters<ReturnType<typeof usePushPrefs.getState>['set']>[0]) => usePushPrefs.getState().set(c);

/** A promise the test resolves by hand, to observe state while the network call is in flight. */
function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => { resolve = r; });
  return { promise, resolve };
}

describe('usePushPrefs', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    usePushPrefs.setState({ prefs: { draws: false, times: false, aor: false }, loading: true });
    useTimelineStore.setState({ milestones: [] });
    useProStore.setState({ active: false, trialEnds: Date.now() + 86_400_000 }); // in the trial
  });

  it('carries a pre-1.0.19 single switch over to draws + processing times', async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.DRAW_NOTIFICATIONS, 'true');
    register.mockResolvedValue({ ok: true });
    await usePushPrefs.getState().load();
    expect(prefs()).toEqual({ draws: true, times: true, aor: false });
    expect(register).toHaveBeenCalledWith({ draws: true, times: true, aorMonth: null }, null);
  });

  it('sends the AOR month from the timeline when the AOR alert is on', async () => {
    useTimelineStore.setState({ milestones: [{ id: '1', type: 'AOR Received', date: '2026-03-14' } as never] });
    register.mockResolvedValue({ ok: true });
    await set({ aor: true });
    expect(register).toHaveBeenCalledWith({ draws: false, times: false, aorMonth: '2026-03' }, null);
    expect(JSON.parse((await AsyncStorage.getItem(STORAGE_KEYS.PUSH_PREFS))!)).toEqual({ times: false, aor: true });
  });

  it('flips on immediately, before registration finishes', async () => {
    const pending = deferred<{ ok: true }>();
    register.mockReturnValue(pending.promise);
    const done = set({ draws: true });
    expect(prefs().draws).toBe(true); // no wait for the network
    pending.resolve({ ok: true });
    await done;
    expect(prefs().draws).toBe(true);
    expect(await AsyncStorage.getItem(STORAGE_KEYS.DRAW_NOTIFICATIONS)).toBe('true');
  });

  it('flips back and explains when enabling fails', async () => {
    register.mockResolvedValue({ ok: false, reason: 'permission_denied' });
    await set({ draws: true });
    expect(prefs().draws).toBe(false);
    expect(Alert.alert).toHaveBeenCalled();
    expect(await AsyncStorage.getItem(STORAGE_KEYS.DRAW_NOTIFICATIONS)).toBeNull();
  });

  it('revokes only when the last alert goes off', async () => {
    register.mockResolvedValue({ ok: true });
    unregister.mockResolvedValue(true);
    await set({ draws: true, times: true });
    await set({ draws: false });
    expect(unregister).not.toHaveBeenCalled();
    expect(register).toHaveBeenLastCalledWith({ draws: false, times: true, aorMonth: null }, null);
    await set({ times: false });
    expect(unregister).toHaveBeenCalledTimes(1);
    expect(await AsyncStorage.getItem(STORAGE_KEYS.DRAW_NOTIFICATIONS)).toBe('false');
  });

  it('ignores a second tap while the first is still in flight', async () => {
    const pending = deferred<{ ok: true }>();
    register.mockReturnValue(pending.promise);
    const first = set({ draws: true });
    await set({ draws: false });
    expect(register).toHaveBeenCalledTimes(1);
    expect(unregister).not.toHaveBeenCalled();
    pending.resolve({ ok: true });
    await first;
    expect(prefs().draws).toBe(true);
  });

  it('after the trial without Pro, sends the Pro alerts as off but keeps the saved choice', async () => {
    useProStore.setState({ active: false, trialEnds: Date.now() - 1 });
    useTimelineStore.setState({ milestones: [{ id: '1', type: 'AOR Received', date: '2026-03-14' } as never] });
    register.mockResolvedValue({ ok: true });
    await set({ draws: true, times: true, aor: true });
    expect(register).toHaveBeenLastCalledWith({ draws: true, times: false, aorMonth: null }, null);
    expect(prefs()).toEqual({ draws: true, times: true, aor: true });

    useProStore.setState({ active: true }); // bought Pro
    await usePushPrefs.getState().resync();
    expect(register).toHaveBeenLastCalledWith({ draws: true, times: true, aorMonth: '2026-03' }, null);
  });
});
