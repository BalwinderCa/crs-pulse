import { renderHook, waitFor } from '@testing-library/react-native';
import { useProcessingTimesBadge } from '@/hooks/useProcessingTimesBadge';
import { useNotificationsStore } from '@/features/notifications/store/notificationsStore';
import { useProcessingTimesStore } from '@/store/processingTimesStore';

const setSeen = (seenProcessing: string | null, loaded = true) =>
  useNotificationsStore.setState({ seenProcessing, loaded });
const setFeed = (updated: string | null) => useProcessingTimesStore.setState({ updated });

describe('useProcessingTimesBadge', () => {
  beforeEach(() => {
    setSeen(null, false);
    setFeed(null);
  });

  it('badges when IRCC publishes a label the user has not opened', () => {
    setSeen('July 1, 2026');
    setFeed('August 10, 2026');
    expect(renderHook(() => useProcessingTimesBadge()).result.current).toBe(true);
  });

  it('does not badge once the seen label matches the live feed', () => {
    setSeen('August 10, 2026');
    setFeed('August 10, 2026');
    expect(renderHook(() => useProcessingTimesBadge()).result.current).toBe(false);
  });

  it('does not badge before the seen marker has loaded', () => {
    setSeen('July 1, 2026', false);
    setFeed('August 10, 2026');
    expect(renderHook(() => useProcessingTimesBadge()).result.current).toBe(false);
  });

  it('initializes a fresh install quietly instead of badging', async () => {
    setSeen(null);
    setFeed('August 10, 2026');
    const { result } = renderHook(() => useProcessingTimesBadge());
    expect(result.current).toBe(false);
    await waitFor(() =>
      expect(useNotificationsStore.getState().seenProcessing).toBe('August 10, 2026'),
    );
  });
});
