import * as StoreReview from 'expo-store-review';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/constants';
import { track, type ReviewTrigger } from '@/services/analyticsService';

/**
 * Asks the OS to show its native "rate this app" sheet — once per install, and
 * only from a genuine success moment: a finished document checklist, or the
 * third good moment counted by `recordPositiveMoment` below. A good moment on
 * its own is not enough, and neither is launch count or elapsed time:
 * both platforms silently swallow the request when they feel like it (iOS caps
 * it at 3 prompts per user per 365 days and shows nothing in TestFlight), so a
 * wasted ask is an ask we never get back.
 *
 * Everything here fails silently. A review prompt is never worth interrupting
 * the flow it fired from.
 */
export async function maybeAskForReview(trigger: ReviewTrigger): Promise<void> {
  try {
    if (await AsyncStorage.getItem(STORAGE_KEYS.REVIEW_PROMPTED)) return;
    if (!(await StoreReview.isAvailableAsync())) return;
    // Written before the request, not after: the OS gives no callback telling
    // us whether it actually showed anything, and re-asking is the worse bug.
    await AsyncStorage.setItem(STORAGE_KEYS.REVIEW_PROMPTED, '1');
    await StoreReview.requestReview();
    track('review_requested', { trigger });
  } catch {}
}

/** Good moments needed before `recordPositiveMoment` asks. */
export const REVIEW_MOMENTS_NEEDED = 3;
/** The install must be at least this old, so nobody is asked in their first session. */
export const REVIEW_MIN_AGE_MS = 2 * 24 * 60 * 60 * 1000;

type Moments = { count: number; firstAt: number };

/**
 * Counts a moment the user got value from: a CRS score appearing, a draw push
 * opened, a milestone added. On the third one, once the first is at least two
 * days old, it asks for a review.
 *
 * Pass `ask: false` where a native sheet would interrupt: while the user is
 * typing scores, or while the app is opening from a push. Those moments still
 * count, and the ask then happens at the next moment that allows it.
 */
export async function recordPositiveMoment(
  { ask = true }: { ask?: boolean } = {},
  now: number = Date.now(),
): Promise<void> {
  try {
    if (await AsyncStorage.getItem(STORAGE_KEYS.REVIEW_PROMPTED)) return;
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.REVIEW_MOMENTS);
    const prev = raw ? (JSON.parse(raw) as Partial<Moments>) : null;
    const moments: Moments = {
      count: (typeof prev?.count === 'number' ? prev.count : 0) + 1,
      firstAt: typeof prev?.firstAt === 'number' ? prev.firstAt : now,
    };
    await AsyncStorage.setItem(STORAGE_KEYS.REVIEW_MOMENTS, JSON.stringify(moments));
    if (
      ask &&
      moments.count >= REVIEW_MOMENTS_NEEDED &&
      now - moments.firstAt >= REVIEW_MIN_AGE_MS
    ) {
      await maybeAskForReview('moments');
    }
  } catch {}
}
