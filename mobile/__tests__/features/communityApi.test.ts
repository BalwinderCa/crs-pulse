import { DEFAULT_FILTERS, aorMonthOf, pageOf, queryTimelines, stageOf } from '@/features/community/communityApi';
import { SAMPLE_TIMELINES } from '@/features/community/sampleTimelines';

describe('community api (sample data)', () => {
  it('pages through every row exactly once', () => {
    const rows = queryTimelines(SAMPLE_TIMELINES, DEFAULT_FILTERS);
    const seen: string[] = [];
    let cursor: string | null = null;
    do {
      const page = pageOf(rows, cursor, 20);
      seen.push(...page.items.map((t) => t.id));
      cursor = page.nextCursor;
    } while (cursor);
    expect(seen).toHaveLength(SAMPLE_TIMELINES.length);
    expect(new Set(seen).size).toBe(SAMPLE_TIMELINES.length);
  });

  it('filters by program, AOR month and stage', () => {
    const rows = queryTimelines(SAMPLE_TIMELINES, { ...DEFAULT_FILTERS, program: 'cec', aorMonth: '2026-05', stage: 'ppr' });
    for (const t of rows) {
      expect(t.program).toBe('cec');
      expect(aorMonthOf(t)).toBe('2026-05');
      expect(stageOf(t)).toBe('ppr');
    }
  });

  it('sorts by most recently updated by default', () => {
    const rows = queryTimelines(SAMPLE_TIMELINES, DEFAULT_FILTERS);
    for (let i = 1; i < rows.length; i++) expect(rows[i]!.updatedDaysAgo).toBeGreaterThanOrEqual(rows[i - 1]!.updatedDaysAgo);
  });

  it('generated samples never share exact dates or future steps', () => {
    for (const t of SAMPLE_TIMELINES) {
      expect(JSON.stringify(t)).not.toMatch(/\d{4}-\d{2}-\d{2}/);
      expect(t.steps[0]!.day).toBe(0);
    }
  });
});
