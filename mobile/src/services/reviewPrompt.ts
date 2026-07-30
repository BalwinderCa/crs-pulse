import * as StoreReview from 'expo-store-review';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/constants';

/**
 * Asks the OS to show its native "rate this app" sheet — once per install, and
 * only from a genuine success moment (see the call site in the document
 * checklist). This is deliberately NOT tied to launch count or elapsed time:
 * both platforms silently swallow the request when they feel like it (iOS caps
 * it at 3 prompts per user per 365 days and shows nothing in TestFlight), so a
 * wasted ask is an ask we never get back.
 *
 * Everything here fails silently. A review prompt is never worth interrupting
 * the flow it fired from.
 */
export async function maybeAskForReview(): Promise<void> {
  try {
    if (await AsyncStorage.getItem(STORAGE_KEYS.REVIEW_PROMPTED)) return;
    if (!(await StoreReview.isAvailableAsync())) return;
    // Written before the request, not after: the OS gives no callback telling
    // us whether it actually showed anything, and re-asking is the worse bug.
    await AsyncStorage.setItem(STORAGE_KEYS.REVIEW_PROMPTED, '1');
    await StoreReview.requestReview();
  } catch {}
}
