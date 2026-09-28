import PostHog from 'posthog-react-native';
import type { PostHogAutocaptureOptions } from 'posthog-react-native';
import type { PushRegisterFailure } from '@/services/pushService';

/**
 * Anonymous usage analytics (PostHog).
 *
 * What is sent: screen names, app lifecycle events (installed / opened /
 * backgrounded / updated), the custom events typed in `EventProperties`, and
 * taps described by component names and `ph-label` props only. Each
 * install gets a random PostHog ID, so DAU, retention and funnels work without
 * any account.
 *
 * What is never sent: calculator inputs, CRS scores, timeline or checklist
 * contents. There is no `identify()`, no person properties and no session
 * replay. Touch autocapture would by default record the tapped element's text
 * (`children`), which on the calculator screens is the user's own age, scores
 * or education, so `propsToCapture` is narrowed to explicit labels.
 *
 * Off in dev builds and when `EXPO_PUBLIC_POSTHOG_KEY` is unset.
 */

const API_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY?.trim() || null;
const HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST?.trim() || 'https://us.i.posthog.com';

/** Exported for tests: babel-preset-expo inlines EXPO_PUBLIC_* at build time. */
export function createAnalytics(apiKey: string | null, dev: boolean): PostHog | null {
  if (dev || !apiKey) return null;
  return new PostHog(apiKey, {
    host: HOST,
    captureAppLifecycleEvents: true,
    enableSessionReplay: false,
    // Makes identify() a no-op, so no code path can attach data to a person.
    personProfiles: 'never',
    // PostHog reads these from expo-localization, which doesn't compile on
    // Xcode 26 at SDK 52 (non-exhaustive switch over calendar identifiers).
    // Hermes' Intl gives the same two values without a native module.
    customAppProperties: (properties) => {
      const { locale, timeZone } = Intl.DateTimeFormat().resolvedOptions();
      return { ...properties, $locale: locale, $timezone: timeZone };
    },
  });
}

export const analytics = createAnalytics(API_KEY, __DEV__);

export const ANALYTICS_AUTOCAPTURE: PostHogAutocaptureOptions = {
  // @react-navigation v7 isn't supported by PostHog's screen autocapture;
  // RootNavigator reports screens via trackScreen instead.
  captureScreens: false,
  captureTouches: true,
  propsToCapture: ['testID', 'ph-label'],
};

/**
 * Every custom event and the only properties it may carry. Adding one means
 * adding it here, which keeps profile data (scores, inputs, milestone or
 * checklist contents) from slipping in as an ad-hoc property.
 */
type EventProperties = {
  crs_calculated: undefined;
  push_enabled: undefined;
  push_disabled: undefined;
  push_enable_failed: { reason: PushRegisterFailure };
  pdf_exported: undefined;
  milestone_added: undefined;
  checklist_item_checked: undefined;
  ad_shown: { format: 'banner' | 'native' | 'app_open' };
};

export type AnalyticsEvent = keyof EventProperties;

export function track<E extends AnalyticsEvent>(
  event: E,
  ...[properties]: EventProperties[E] extends undefined ? [] : [EventProperties[E]]
): void {
  if (!analytics) return;
  try {
    analytics.capture(event, properties);
  } catch {}
}

let lastScreen: string | null = null;

/** Records a screen view. Route names only — params can carry user data. */
export function trackScreen(name: string | undefined): void {
  if (!analytics || !name || name === lastScreen) return;
  lastScreen = name;
  void analytics.screen(name).catch(() => {});
}
