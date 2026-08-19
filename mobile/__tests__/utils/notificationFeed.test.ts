import { buildNotificationFeed } from '@/features/notifications/utils/feed';
import type { Draw } from '@/types';

const draw = (n: number, date: string): Draw =>
  ({ draw_number: n, date, cutoff_score: 500, category: 'CEC' }) as Draw;

// Mirrors the real data at the time of writing: draws either side of the
// processing-times label, so a pinned row and a sorted row look different.
const DRAWS = [draw(435, '2026-08-17'), draw(434, '2026-08-07'), draw(433, '2026-08-06')];

const order = (items: ReturnType<typeof buildNotificationFeed>) =>
  items.map((i) => (i.kind === 'draw' ? `#${i.draw.draw_number}` : 'processing'));

describe('buildNotificationFeed', () => {
  it('interleaves the processing-times row by date, not pinned to the top', () => {
    expect(order(buildNotificationFeed(DRAWS, 'August 10, 2026'))).toEqual([
      '#435', // Aug 17
      'processing', // Aug 10
      '#434', // Aug 7
      '#433', // Aug 6
    ]);
  });

  it('puts the processing row last when it is the oldest', () => {
    expect(order(buildNotificationFeed(DRAWS, 'August 1, 2026')).at(-1)).toBe('processing');
  });

  it('puts it first when it is the newest', () => {
    expect(order(buildNotificationFeed(DRAWS, 'August 18, 2026'))[0]).toBe('processing');
  });

  it('omits the processing row entirely when there is no live label', () => {
    expect(order(buildNotificationFeed(DRAWS, null))).toEqual(['#435', '#434', '#433']);
  });

  it('keeps an unparseable label visible at the top rather than dropping it', () => {
    // Hermes cannot parse IRCC's label with Date.parse; if the format ever
    // changes we must not silently lose the row.
    expect(order(buildNotificationFeed(DRAWS, 'sometime in August'))[0]).toBe('processing');
  });

  it('caps the feed length including the processing row', () => {
    const many = Array.from({ length: 30 }, (_, i) =>
      draw(400 + i, `2026-07-${String((i % 28) + 1).padStart(2, '0')}`),
    );
    expect(buildNotificationFeed(many, 'August 10, 2026')).toHaveLength(15);
  });
});
