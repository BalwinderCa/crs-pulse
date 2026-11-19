import { useEffect, useMemo, useState } from 'react';
import { useTimelineStore } from '@/store/timelineStore';
import { sharedAorMonth, toSharedSteps, type ProgramId, type SharedTimeline } from './model';
import { fetchCommunitySummary, fetchCommunityTimeline, type CommunitySummary } from './communityApi';
import { useShareStore } from './shareStore';

export const MY_TIMELINE_ID = 'mine';

/**
 * The user's own shared timeline, rebuilt from the live milestones. Other
 * people's timelines come from the server, one page or one timeline at a time.
 */
export function useCommunity() {
  const milestones = useTimelineStore((st) => st.milestones);
  const { settings, load } = useShareStore();
  useEffect(() => { void load(); }, [load]);

  // The user's steps with months, for "Compared with you"; never sent anywhere.
  const mySteps = useMemo(() => toSharedSteps(milestones, false), [milestones]);
  const mine: SharedTimeline | null = useMemo(() => {
    if (!settings) return null;
    const steps = toSharedSteps(milestones, true);
    if (!steps.length) return null;
    const mineTl: SharedTimeline = { id: MY_TIMELINE_ID, alias: settings.alias, program: settings.program, steps, updatedDaysAgo: 0, isMine: true };
    const aorMonth = sharedAorMonth(milestones);
    if (aorMonth) mineTl.aorMonth = aorMonth;
    if (settings.avatar) mineTl.avatar = settings.avatar;
    return mineTl;
  }, [settings, milestones]);

  return { mine, mySteps, settings };
}

/** Loads `fetcher(key)`; a result for a key that's no longer current is dropped. */
function useFetched<K, T>(key: K | undefined, fetcher: (k: K) => Promise<T>): { data: T | undefined; loading: boolean } {
  const [state, setState] = useState<{ key: K | undefined; data: T | undefined }>({ key: undefined, data: undefined });
  useEffect(() => {
    if (key === undefined) return;
    let live = true;
    fetcher(key).then(
      (data) => { if (live) setState({ key, data }); },
      // shortcut: a failed fetch reads as "not found", no retry; add one when the server is real.
      () => { if (live) setState({ key, data: undefined }); },
    );
    return () => { live = false; };
  }, [key, fetcher]);
  const current = state.key === key;
  return { data: current ? state.data : undefined, loading: key !== undefined && !current };
}

/** One shared timeline: yours from the device, anyone else's from the server. */
export function useSharedTimeline(id: string): { timeline: SharedTimeline | null; loading: boolean } {
  const { mine } = useCommunity();
  const remote = useFetched(id === MY_TIMELINE_ID ? undefined : id, fetchCommunityTimeline);
  if (id === MY_TIMELINE_ID) return { timeline: mine, loading: false };
  return { timeline: remote.data ?? null, loading: remote.loading };
}

/** The program's typical pace (median day per stop); empty until it loads. */
export function useCommunitySummary(program: ProgramId | undefined): CommunitySummary {
  return useFetched(program, fetchCommunitySummary).data ?? [];
}
