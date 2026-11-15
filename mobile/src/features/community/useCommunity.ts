import { useEffect, useMemo } from 'react';
import { useTimelineStore } from '@/store/timelineStore';
import { toSharedSteps, type SharedTimeline } from './model';
import { SAMPLE_TIMELINES } from './sampleTimelines';
import { useShareStore } from './shareStore';

export const MY_TIMELINE_ID = 'mine';

/**
 * The Community data the screens read: the user's own shared timeline (rebuilt
 * from the live milestones) and everyone else's. Until a server exists,
 * "everyone else" is SAMPLE_TIMELINES.
 */
export function useCommunity() {
  const milestones = useTimelineStore((st) => st.milestones);
  const { settings, load } = useShareStore();
  useEffect(() => { void load(); }, [load]);

  // The user's steps with months, for "Compared with you"; never sent anywhere.
  const mySteps = useMemo(() => toSharedSteps(milestones, false), [milestones]);
  const mine: SharedTimeline | null = useMemo(() => {
    if (!settings) return null;
    const steps = toSharedSteps(milestones, settings.showMonths);
    return steps.length
      ? { id: MY_TIMELINE_ID, alias: settings.alias, program: settings.program, steps, updatedDaysAgo: 0, isMine: true }
      : null;
  }, [settings, milestones]);

  return { mine, mySteps, others: SAMPLE_TIMELINES, settings };
}

export function useSharedTimeline(id: string): SharedTimeline | null {
  const { mine, others } = useCommunity();
  return id === MY_TIMELINE_ID ? mine : others.find((t) => t.id === id) ?? null;
}
