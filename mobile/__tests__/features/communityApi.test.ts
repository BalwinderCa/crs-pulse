import {
  DEFAULT_FILTERS, aorMonthOf, fetchCommunitySummary, fetchCommunityTimeline, pageOf, queryTimelines, stageOf,
} from '@/features/community/communityApi';
import { typicalPace } from '@/features/community/model';
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

  it('gets one timeline by id, and null for an unknown id', async () => {
    const t = SAMPLE_TIMELINES[5]!;
    await expect(fetchCommunityTimeline(t.id)).resolves.toBe(t);
    await expect(fetchCommunityTimeline('no-such-id')).resolves.toBeNull();
  });

  it('summarises only the requested program', async () => {
    const cec = SAMPLE_TIMELINES.filter((t) => t.program === 'cec');
    const summary = await fetchCommunitySummary('cec');
    expect(summary).toEqual(typicalPace(cec));
    expect(summary.length).toBeGreaterThan(0);
    for (const p of summary) expect(p.n).toBeLessThanOrEqual(cec.length);
  });
});
