import { createNavigationContainerRef, StackActions } from '@react-navigation/native';
import type { RootStackParamList } from '@/types';

/** Where a tapped notification leads. */
export type PushTarget =
  | { screen: 'Draws' }
  | { screen: 'ProcessingTimes' }
  | { screen: 'Community'; aorMonth: string | null };

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

// A tap that launched the app arrives before the navigator exists.
let pending: PushTarget | null = null;

function go(target: PushTarget): void {
  // Never skip onboarding.
  if (navigationRef.getCurrentRoute()?.name === 'Onboarding') return;
  if (target.screen === 'ProcessingTimes') {
    navigationRef.navigate('ProcessingTimes');
    return;
  }
  // popTo, so a screen open above the tabs is closed instead of a second Main being stacked.
  navigationRef.dispatch(StackActions.popTo('Main', target.screen === 'Draws'
    ? { screen: 'Draws' }
    // `at` makes a repeat tap for the same month apply the filter again.
    : { screen: 'Timeline', params: { community: { aorMonth: target.aorMonth, at: Date.now() } } }));
}

export function openFromPush(target: PushTarget): void {
  if (navigationRef.isReady()) go(target);
  else pending = target;
}

/** Called by the NavigationContainer once it is ready. */
export function flushPendingPush(): void {
  const target = pending;
  pending = null;
  if (target) go(target);
}
