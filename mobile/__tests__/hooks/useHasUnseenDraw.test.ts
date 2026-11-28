import { act, renderHook } from '@testing-library/react-native';
import { useHasUnseenDraw } from '@/features/notifications/useHasUnseenDraw';
import { useNotificationsStore } from '@/features/notifications/store/notificationsStore';
import { useDrawsStore } from '@/store/drawsStore';
import type { Draw } from '@/types';

describe('useHasUnseenDraw', () => {
  it('shows for a newer draw and clears once it is seen', async () => {
    useDrawsStore.setState({ draws: [{ draw_number: 456 } as Draw] });
    useNotificationsStore.setState({ loaded: true, seenDraw: null });
    const { result } = renderHook(() => useHasUnseenDraw());
    expect(result.current).toBe(false); // fresh install starts quiet

    act(() => useNotificationsStore.setState({ seenDraw: 455 }));
    expect(result.current).toBe(true);

    await act(() => useNotificationsStore.getState().markSeen(456));
    expect(result.current).toBe(false);
  });
});
