import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useCommunityFeed } from '@/features/community/useCommunityFeed';
import { DEFAULT_FILTERS, PAGE_SIZE, queryTimelines } from '@/features/community/communityApi';
import { SAMPLE_TIMELINES } from '@/features/community/sampleTimelines';

describe('useCommunityFeed', () => {
  it('loads the first page, then the next ones, until there are no more', async () => {
    const total = queryTimelines(SAMPLE_TIMELINES, DEFAULT_FILTERS).length;
    const { result } = renderHook(() => useCommunityFeed(DEFAULT_FILTERS));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items).toHaveLength(PAGE_SIZE);
    expect(result.current.hasMore).toBe(true);

    while (result.current.hasMore) {
      await act(async () => { await result.current.loadMore(); });
    }
    expect(result.current.items).toHaveLength(total);
    expect(new Set(result.current.items.map((t) => t.id)).size).toBe(total);
  });

  it('starts over when the filters change', async () => {
    const { result, rerender } = renderHook(({ f }) => useCommunityFeed(f), { initialProps: { f: DEFAULT_FILTERS } });
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await result.current.loadMore(); });

    const fst = { ...DEFAULT_FILTERS, program: 'fst' as const };
    rerender({ f: fst });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items.every((t) => t.program === 'fst')).toBe(true);
    expect(result.current.items).toHaveLength(Math.min(PAGE_SIZE, queryTimelines(SAMPLE_TIMELINES, fst).length));
  });
});
