import { isValid, parse, parseISO } from 'date-fns';
import type { Draw } from '@/types';

/** A row in the notifications list: an IRCC draw, or a processing-times update. */
export type FeedItem =
  | { kind: 'draw'; at: Date; draw: Draw }
  | { kind: 'processing'; at: Date; label: string };

export const MAX_FEED_ITEMS = 15;

/**
 * Merges draws and the current processing-times update into ONE reverse-
 * chronological feed — a notifications list ordered by anything else reads as
 * broken.
 *
 * The mirror publishes `updated` as IRCC's English label ("August 10, 2026"),
 * which Hermes' `Date.parse` does not handle — hence the explicit date-fns
 * format. An unparseable label sorts to the top rather than vanishing, since it
 * is still the current state of the feed.
 */
export function buildNotificationFeed(
  draws: Draw[],
  procUpdated: string | null,
  max: number = MAX_FEED_ITEMS,
): FeedItem[] {
  const feed: FeedItem[] = draws.map((draw) => ({
    kind: 'draw',
    at: parseISO(draw.date.slice(0, 10)),
    draw,
  }));

  if (procUpdated) {
    feed.push({
      kind: 'processing',
      at: parse(procUpdated, 'MMMM d, yyyy', new Date()),
      label: procUpdated,
    });
  }

  return feed
    .sort((a, b) => {
      if (!isValid(a.at)) return -1;
      if (!isValid(b.at)) return 1;
      return b.at.getTime() - a.at.getTime();
    })
    .slice(0, max);
}
