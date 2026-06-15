import { useMemo } from 'react';
import { useProcessingTimesStore } from '@/store/processingTimesStore';
import {
  APPLICATION_CATEGORIES,
  PROCESSING_TIMES_UPDATED,
  applyLiveTimes,
  findApplicationType,
  type ApplicationCategory,
} from '@/features/tracker/data/processingTimes';

/**
 * Single entry point for processing-times data. Overlays the GitHub-mirrored
 * IRCC figures onto the bundled categories when available, and exposes the
 * matching "last updated" label (live when present, bundled otherwise).
 *
 * Screens use this instead of importing the bundled constants directly so the
 * displayed months/people-waiting and the update date all stay consistent.
 */
export function useProcessingTimes() {
  const live = useProcessingTimesStore((s) => s.times);
  const liveUpdated = useProcessingTimesStore((s) => s.updated);

  const categories = useMemo<ApplicationCategory[]>(
    () => applyLiveTimes(APPLICATION_CATEGORIES, live),
    [live],
  );

  const findType = (categoryId: string, typeId: string) =>
    findApplicationType(categoryId, typeId, categories);

  return {
    categories,
    findType,
    updatedLabel: liveUpdated ?? PROCESSING_TIMES_UPDATED,
    isLive: live !== null,
  };
}
