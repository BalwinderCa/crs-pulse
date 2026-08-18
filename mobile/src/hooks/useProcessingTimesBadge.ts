import { useEffect } from 'react';
import { useNotificationsStore } from '@/features/notifications/store/notificationsStore';
import { useProcessingTimesStore } from '@/store/processingTimesStore';

/**
 * True when IRCC has published a processing-times update the user hasn't opened
 * yet. Drives the red dot on the header hamburger and on the side-menu row;
 * cleared when ProcessingTimesScreen mounts.
 *
 * ponytail: badges on the feed's `updated` label while the worker's push fires on
 * a months change — IRCC bumps both together monthly, and the label is the value
 * the user actually sees on the page.
 */
export function useProcessingTimesBadge(): boolean {
  const updated = useProcessingTimesStore((s) => s.updated);
  const { seenProcessing, loaded, markProcessingSeen } = useNotificationsStore();

  // First run: initialize quietly so a fresh install doesn't start with a badge.
  useEffect(() => {
    if (loaded && seenProcessing === null && updated) markProcessingSeen(updated);
  }, [loaded, seenProcessing, updated, markProcessingSeen]);

  return loaded && seenProcessing !== null && !!updated && updated !== seenProcessing;
}
