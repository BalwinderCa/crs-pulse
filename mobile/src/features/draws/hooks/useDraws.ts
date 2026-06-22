import { useMemo } from 'react';
import { parseISO } from 'date-fns';
import { useDrawsStore } from '@/store/drawsStore';
import type { Draw, DrawFilter } from '@/types';

type Params = {
  filter?: DrawFilter;
  category?: string;
};

const now = new Date();

function applyFilter(draws: Draw[], filter?: DrawFilter): Draw[] {
  if (!filter || filter === 'all') return draws;
  const cutoff = new Date(now);
  if (filter === 'last_month') cutoff.setMonth(cutoff.getMonth() - 1);
  if (filter === 'last_year')  cutoff.setFullYear(cutoff.getFullYear() - 1);
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
