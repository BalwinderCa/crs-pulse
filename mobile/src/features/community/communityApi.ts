import { STOPS, reachedIndex, currentStep, typicalPace, type ProgramId, type SharedStep, type SharedTimeline, type Stop } from './model';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/constants';
import { buildPushHeaders } from '@/services/pushService';
import { SAMPLE_TIMELINES } from './sampleTimelines';

/**
 * The Community feed's data layer, shaped like the server API it will call:
 *
 *   GET /community?program=cec&aor=2026-08&stage=ppr&sort=recent&cursor=…&limit=20
 *   → { items: SharedTimeline[], nextCursor: string | null }
 *
 * It calls the push worker (workers/push/src/community.ts) when the build has
 * EXPO_PUBLIC_PUSH_URL, and pages through SAMPLE_TIMELINES otherwise (a dev
 * build without .env.local).
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

const serverUrl = (): string | null => process.env.EXPO_PUBLIC_PUSH_URL?.replace(/\/$/, '') || null;

/** A worker call; 404 comes back as null, any other failure throws. */
async function call<T>(path: string, init: { method?: string; headers?: Record<string, string>; body?: string } = {}): Promise<T | null> {
  const res = await fetch(`${serverUrl()}${path}`, { ...init, headers: { ...buildPushHeaders(), ...init.headers } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`community ${init.method ?? 'GET'} ${path}: ${res.status}`);
  return res.status === 204 ? null : (await res.json()) as T;
}

/** This device's shared row: its public id and the key that proves it's ours. */
type Owner = { id: string; key: string };

async function getOwner(): Promise<Owner | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.COMMUNITY_OWNER);
    return raw ? (JSON.parse(raw) as Owner) : null;
  } catch {
    return null;
  }
}

const markMine = (t: SharedTimeline, owner: Owner | null): SharedTimeline => (owner && t.id === owner.id ? { ...t, isMine: true } : t);

// Stand-in for network latency, so loading states show in dev.
const latency = () => new Promise((r) => setTimeout(r, 350));

export async function fetchCommunityPage(
  filters: CommunityFilters,
  cursor: string | null,
  limit = PAGE_SIZE,
): Promise<CommunityPage> {
  if (serverUrl()) {
    const q = new URLSearchParams({ sort: filters.sort, limit: String(limit) });
    if (filters.program !== 'all') q.set('program', filters.program);
    if (filters.aorMonth) q.set('aor', filters.aorMonth);
    if (filters.stage) q.set('stage', filters.stage);
    if (cursor) q.set('cursor', cursor);
    const [page, owner] = await Promise.all([call<CommunityPage>(`/community?${q}`), getOwner()]);
    if (!page) throw new Error('community feed: 404');
    return { items: page.items.map((t) => markMine(t, owner)), nextCursor: page.nextCursor };
  }
  await latency();
  return pageOf(queryTimelines(SAMPLE_TIMELINES, filters), cursor, limit);
}

/** GET /community/:id → SharedTimeline, or 404 (null) once it's unshared. */
export async function fetchCommunityTimeline(id: string): Promise<SharedTimeline | null> {
  if (serverUrl()) {
    const [t, owner] = await Promise.all([call<SharedTimeline>(`/community/${encodeURIComponent(id)}`), getOwner()]);
    return t && markMine(t, owner);
  }
  await latency();
  return SAMPLE_TIMELINES.find((t) => t.id === id) ?? null;
}

export type CommunitySummary = ReturnType<typeof typicalPace>;

/**
 * GET /community/summary?program=cec → the median day each stop is reached.
 * The server computes it over every timeline in the program (and can cache it),
 * so the app never needs the whole list.
 */
export async function fetchCommunitySummary(program: ProgramId): Promise<CommunitySummary> {
  if (serverUrl()) return (await call<CommunitySummary>(`/community/summary?program=${program}`)) ?? [];
  await latency();
  return typicalPace(SAMPLE_TIMELINES.filter((t) => t.program === program));
}

export type PublishBody = { alias: string; program: ProgramId; aorMonth?: string; steps: SharedStep[] };

/** PUT /community/me: shares or updates this device's timeline. The first share gets its key from the server. */
export async function publishTimeline(body: PublishBody): Promise<void> {
  if (!serverUrl()) return;
  const owner = await getOwner();
  const res = await call<Owner>('/community/me', {
    method: 'PUT',
    headers: owner ? { 'X-Community-Key': owner.key } : {},
    body: JSON.stringify(body),
  });
  if (res && (res.id !== owner?.id || res.key !== owner?.key)) {
    await AsyncStorage.setItem(STORAGE_KEYS.COMMUNITY_OWNER, JSON.stringify({ id: res.id, key: res.key }));
  }
}

/** DELETE /community/me. Throws if the server didn't confirm, so the app can keep saying it's shared. */
export async function unpublishTimeline(): Promise<void> {
  if (!serverUrl()) return;
  const owner = await getOwner();
  if (!owner) return;
  await call('/community/me', { method: 'DELETE', headers: { 'X-Community-Key': owner.key } });
  // A later share starts a new, unlinked row.
  await AsyncStorage.removeItem(STORAGE_KEYS.COMMUNITY_OWNER);
}
