import { AppState, Platform } from 'react-native';

// `require` is provided by the Metro runtime; declare it for the TS compiler.
declare const require: (module: string) => unknown;

/**
 * Resolves once the app is in the foreground ('active'). iOS only presents the
 * App Tracking Transparency prompt while the app is active — requesting it
 * during launch/splash (a non-active state) makes the system silently skip the
 * dialog, leaving the status 'undetermined' and no IDFA ever granted. We wait
 * for the active state (resolving immediately if already active) before asking.
 */
function whenAppActive(): Promise<void> {
  if (AppState.currentState === 'active') return Promise.resolve();
  return new Promise((resolve) => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        sub.remove();
        resolve();
      }
    });
  });
}

/**
 * Initializes the Google Mobile Ads SDK once at app boot. The native module
 * only exists in a custom dev/EAS build, so this is fully guarded: in Expo Go,
 * a JS-only client, or before the app is rebuilt, it simply no-ops and ads
 * never render.
 *
 * On iOS the ATT prompt is requested first (once the app is active), so ad
 * attribution is in place before the SDK initializes.
 */
export async function initAds(): Promise<void> {
  try {
    if (Platform.OS === 'ios') {
      // Defer until the app is foreground-active so the ATT dialog actually shows.
      await whenAppActive();

      const { getTrackingPermissionsAsync, requestTrackingPermissionsAsync } = require(
        'expo-tracking-transparency',
      ) as {
        getTrackingPermissionsAsync: () => Promise<{ status: string; canAskAgain: boolean }>;
        requestTrackingPermissionsAsync: () => Promise<{ status: string }>;
      };

      // Only prompt when the system will actually present the dialog; re-asking
      // after a decision is a no-op that the OS ignores.
      const current = await getTrackingPermissionsAsync();
      if (current.status === 'undetermined' && current.canAskAgain) {
        await requestTrackingPermissionsAsync();
      }
    }

    const mod = require('react-native-google-mobile-ads') as {
      default: () => { initialize: () => Promise<unknown> };
    };
    await mod.default().initialize();
  } catch {
    // Native module unavailable or init failed — banners will stay hidden.
  }
}
