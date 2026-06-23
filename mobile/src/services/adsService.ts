import { Platform } from 'react-native';

// `require` is provided by the Metro runtime; declare it for the TS compiler.
declare const require: (module: string) => unknown;

/**
 * Initializes the Google Mobile Ads SDK once at app boot. The native module
 * only exists in a custom dev/EAS build, so this is fully guarded: in Expo Go,
 * a JS-only client, or before the app is rebuilt, it simply no-ops and ads
 * never render.
 */
export async function initAds(): Promise<void> {
  try {
    if (Platform.OS === 'ios') {
      const { requestTrackingPermissionsAsync } = require('expo-tracking-transparency') as {
        requestTrackingPermissionsAsync: () => Promise<{ status: string }>;
      };
      await requestTrackingPermissionsAsync();
    }

    const mod = require('react-native-google-mobile-ads') as {
      default: () => { initialize: () => Promise<unknown> };
    };
    await mod.default().initialize();
  } catch {
    // Native module unavailable or init failed — banners will stay hidden.
  }
}
