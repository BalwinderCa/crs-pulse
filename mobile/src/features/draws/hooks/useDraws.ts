import { useMemo } from 'react';
import { parseISO } from 'date-fns';
import { useDrawsStore } from '@/store/drawsStore';
import type { Draw, DrawFilter } from '@/types';

type Params = {
  filter?: DrawFilter;
  category?: string;
};

export function applyFilter(draws: Draw[], filter?: DrawFilter, now = new Date()): Draw[] {
  if (!filter || filter === 'all') return draws;
  // 'this_year' is the calendar year (since January 1); 'last_month' is rolling.
  const cutoff =
    filter === 'this_year'
      ? new Date(now.getFullYear(), 0, 1)
      : new Date(now.getFullYear(), now.getMonth() - 1, now.getDate(), now.getHours(), now.getMinutes());
  return draws.filter(d => parseISO(d.date) >= cutoff);
}

export function useDraws({ filter, category }: Params = {}) {
  const { draws, isLoading, isRefreshing, error, refresh } = useDrawsStore();

  const filtered = useMemo(() => {
    let result = draws;
    if (category && category !== 'all') result = result.filter(d => d.category === category);
    result = applyFilter(result, filter);
    return result;
  }, [draws, filter, category]);

  return {
    draws: filtered,
    isLoading,
    isRefreshing,
    isError: !!error,
    error: error ? { message: error } : null,
    refetch: refresh,
  };
}

// Alias for screens that used the old paginated hook
export function useAllDrawItems(params: Params = {}): Draw[] {
  return useDraws(params).draws;
}
