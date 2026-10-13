import { applyFilter } from '@/features/draws/hooks/useDraws';
import type { Draw } from '@/types';

const draw = (draw_number: number, date: string) => ({ draw_number, date }) as Draw;
const numbers = (draws: Draw[]) => draws.map((d) => d.draw_number);

describe('applyFilter', () => {
  const now = new Date(2026, 9, 13, 12, 0); // October 13, 2026
  const draws = [
    draw(5, '2026-10-01'),
    draw(4, '2026-09-10'),
    draw(3, '2026-01-01'),
    draw(2, '2025-12-31'),
    draw(1, '2025-10-20'),
  ];

  it('returns everything for "all" or no filter', () => {
    expect(numbers(applyFilter(draws, 'all', now))).toEqual([5, 4, 3, 2, 1]);
    expect(numbers(applyFilter(draws, undefined, now))).toEqual([5, 4, 3, 2, 1]);
  });

  it('"this_year" keeps draws since January 1 of the current year', () => {
    // Draw 1 is within the past 12 months but belongs to 2025.
    expect(numbers(applyFilter(draws, 'this_year', now))).toEqual([5, 4, 3]);
  });

  it('"last_month" keeps draws from the past month', () => {
    expect(numbers(applyFilter(draws, 'last_month', now))).toEqual([5]);
  });
});
