import { STOPS, reachedIndex, currentStep, type ProgramId, type SharedTimeline, type Stop } from './model';
import { SAMPLE_TIMELINES } from './sampleTimelines';

/**
 * The Community feed's data layer, shaped like the server API it will call:
 *
 *   GET /community?program=cec&aor=2026-08&stage=ppr&sort=recent&cursor=…&limit=20
 *   → { items: SharedTimeline[], nextCursor: string | null }
 *
 * Until the Worker route exists it pages through SAMPLE_TIMELINES. When it
 * does, only fetchCommunityPage changes (the server should use a keyset cursor
 * on (updated_at, id), so a timeline shared mid-scroll can't duplicate a row).
 */

export type CommunitySort = 'recent' | 'longest' | 'furthest';

export type CommunityFilters = {
  program: ProgramId | 'all';
  /** "2026-08": only timelines whose AOR fell in that month. */
  aorMonth: string | null;
  /** The furthest stop reached. */
  stage: Stop | null;
  sort: CommunitySort;
};

export const DEFAULT_FILTERS: CommunityFilters = { program: 'all', aorMonth: null, stage: null, sort: 'recent' };

export const PAGE_SIZE = 20;

export type CommunityPage = { items: SharedTimeline[]; nextCursor: string | null };

export const aorMonthOf = (t: SharedTimeline): string | undefined => t.aorMonth;

export const stageOf = (t: SharedTimeline): Stop | undefined => STOPS[reachedIndex(t)];

const lastDay = (t: SharedTimeline) => currentStep(t)?.day ?? 0;

/** Filter and sort, as the server will. Ties break on id so pages stay stable. */
export function queryTimelines(all: SharedTimeline[], f: CommunityFilters): SharedTimeline[] {
  const rows = all.filter((t) =>
    (f.program === 'all' || t.program === f.program)
    && (!f.aorMonth || aorMonthOf(t) === f.aorMonth)
    && (!f.stage || stageOf(t) === f.stage));
  const byId = (a: SharedTimeline, b: SharedTimeline) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const cmp: Record<CommunitySort, (a: SharedTimeline, b: SharedTimeline) => number> = {
    recent: (a, b) => a.updatedDaysAgo - b.updatedDaysAgo || byId(a, b),
    longest: (a, b) => lastDay(b) - lastDay(a) || byId(a, b),
    furthest: (a, b) => reachedIndex(b) - reachedIndex(a) || lastDay(a) - lastDay(b) || byId(a, b),
  };
  return rows.sort(cmp[f.sort]);
}

export function pageOf(rows: SharedTimeline[], cursor: string | null, limit = PAGE_SIZE): CommunityPage {
  const start = cursor ? Number(cursor) || 0 : 0;
  const items = rows.slice(start, start + limit);
  const end = start + items.length;
  return { items, nextCursor: end < rows.length ? String(end) : null };
}

export async function fetchCommunityPage(
  filters: CommunityFilters,
  cursor: string | null,
  limit = PAGE_SIZE,
): Promise<CommunityPage> {
  // Stand-in for network latency, so loading states show in dev.
  await new Promise((r) => setTimeout(r, 350));
  return pageOf(queryTimelines(SAMPLE_TIMELINES, filters), cursor, limit);
}
