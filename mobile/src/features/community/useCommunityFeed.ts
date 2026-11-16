import { useCallback, useEffect, useRef, useState } from 'react';
import type { SharedTimeline } from './model';
import { fetchCommunityPage, type CommunityFilters } from './communityApi';

/**
 * One filtered, paged Community list. Changing the filters starts over from
 * the first page; a response for filters that are no longer current is dropped.
 */
export function useCommunityFeed(filters: CommunityFilters) {
  const [items, setItems] = useState<SharedTimeline[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const req = useRef(0);
  const busy = useRef(false);

  const first = useCallback(async (mode: 'load' | 'refresh') => {
    const id = ++req.current;
    busy.current = true;
    setError(false);
    if (mode === 'load') { setLoading(true); setItems([]); setCursor(null); } else setRefreshing(true);
    try {
      const page = await fetchCommunityPage(filters, null);
      if (id !== req.current) return;
      setItems(page.items);
      setCursor(page.nextCursor);
    } catch {
      if (id === req.current) setError(true);
    } finally {
      if (id === req.current) { busy.current = false; setLoading(false); setRefreshing(false); }
    }
  }, [filters]);

  useEffect(() => { void first('load'); }, [first]);

  const loadMore = useCallback(async () => {
    if (busy.current || !cursor) return;
    const id = req.current;
    busy.current = true;
    setLoadingMore(true);
    try {
      const page = await fetchCommunityPage(filters, cursor);
      if (id !== req.current) return;
      setItems((prev) => [...prev, ...page.items]);
      setCursor(page.nextCursor);
    } catch {
      if (id === req.current) setError(true);
    } finally {
      if (id === req.current) { busy.current = false; setLoadingMore(false); }
    }
  }, [filters, cursor]);

  return {
    items, loading, loadingMore, refreshing, error,
    hasMore: cursor !== null,
    loadMore,
    refresh: () => first('refresh'),
    retry: () => (items.length ? loadMore() : first('load')),
  };
}
