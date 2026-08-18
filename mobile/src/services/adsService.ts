import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ADMOB_APP_OPEN_AD_UNIT, STORAGE_KEYS } from '@/constants';

// `require` is provided by the Metro runtime; declare it for the TS compiler.
declare const require: (module: string) => unknown;

interface AppOpenAdHandle {
  addAdEventListener: (type: string, listener: (err?: unknown) => void) => () => void;
  load: () => void;
  show: () => void;
}

interface AdsModule {
  default: () => { initialize: () => Promise<unknown> };
  AppOpenAd?: { createForAdRequest: (unitId: string) => AppOpenAdHandle };
  AdEventType?: { LOADED: string; ERROR: string; CLOSED: string };
  TestIds?: { APP_OPEN?: string };
}

/**
 * react-native-google-mobile-ads is a NATIVE module — it only exists in a
 * custom dev/EAS build, never in Expo Go or a JS-only client.
 */
function loadAdsModule(): AdsModule | null {
  try {
    return require('react-native-google-mobile-ads') as AdsModule;
  } catch {
    return null;
  }
}

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
 * Initializes the Google Mobile Ads SDK WITHOUT the ATT prompt — the
 * splash-screen app-open ad needs the SDK before the app is 'active', which is
 * the state ATT waits for. The native SDK's own initialize() is idempotent, so
 * this is safe to call from both entry points. Never rejects: when the native
 * module is missing or init fails, ads simply never render.
 */
function initSdk(): Promise<void> {
  const mod = loadAdsModule();
  if (!mod) return Promise.resolve();
  try {
    return mod
      .default()
      .initialize()
      .then(() => undefined)
      .catch(() => undefined);
  } catch {
    return Promise.resolve(); // native module present but unusable
  }
}

/**
 * Initializes the Google Mobile Ads SDK at app boot and, on iOS, requests the
 * ATT permission first (once the app is active) so ad attribution is in place.
 * Safe to call repeatedly — the SDK is only initialized once.
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

    await initSdk();
  } catch {
    // Native module unavailable or init failed — ads will stay hidden.
  }
}

/** Show the splash ad on every Nth cold launch, not every one. */
const APP_OPEN_EVERY_N_LAUNCHES = 3;

/**
 * Counts this cold launch and reports whether it is an ad launch — true on
 * every 3rd, so launches 1 and 2 boot straight through with no splash hold.
 *
 * Consumes the turn, so call it exactly once per launch. Fails CLOSED: if
 * storage is unavailable we skip the ad rather than risk holding the splash on
 * every single launch.
 */
export async function takeAppOpenAdTurn(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.APP_OPEN_LAUNCHES);
    const count = (parseInt(raw ?? '0', 10) || 0) + 1;
    await AsyncStorage.setItem(STORAGE_KEYS.APP_OPEN_LAUNCHES, String(count));
    return count % APP_OPEN_EVERY_N_LAUNCHES === 0;
  } catch {
    return false;
  }
}

/** Absolute ceiling on a *displayed* ad — see showAppOpenAd. */
const SHOW_CEILING_MS = 60_000;

function appOpenUnitId(mod: AdsModule): string {
  // Debug builds always serve Google's test unit, never a live one.
  if (__DEV__) return mod.TestIds?.APP_OPEN ?? '';
  return Platform.OS === 'ios' ? ADMOB_APP_OPEN_AD_UNIT.ios : ADMOB_APP_OPEN_AD_UNIT.android;
}

/**
 * Loads and shows a full-screen AdMob *app open* ad over the splash screen, and
 * resolves once it is dismissed. This is the only ad format Google allows on a
 * launch screen.
 *
 * Resolves `false` — immediately or at `timeoutMs` — whenever there is nothing
 * to show: no native module, no configured unit id, no fill, or a slow load.
 * The caller hides the splash the moment this resolves, so the timeout is the
 * hard cap on how long a user can be held on the logo.
 */
export function showAppOpenAd(timeoutMs: number): Promise<boolean> {
  const mod = loadAdsModule();
  const unitId = mod ? appOpenUnitId(mod) : '';
  if (!mod?.AppOpenAd || !mod.AdEventType || !unitId) return Promise.resolve(false);
  const { AdEventType } = mod;

  return new Promise<boolean>((resolve) => {
    let settled = false;
    // ponytail: one guard for every exit (timeout, error, close) — an app-open
    // ad that resolves twice, or never, strands the user on the splash.
    const finish = (shown: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      unsubscribe.forEach((off) => off());
      resolve(shown);
    };

    let timer = setTimeout(() => finish(false), timeoutMs);
    const unsubscribe: (() => void)[] = [];

    initSdk()
      .then(() => {
        if (settled) return; // timed out while the SDK was starting
        const ad = mod.AppOpenAd!.createForAdRequest(unitId);
        unsubscribe.push(
          ad.addAdEventListener(AdEventType.LOADED, () => {
            // Past this point the ad owns the screen, so the load cap no longer
            // applies — only CLOSED (or an error) releases the splash. The much
            // longer ceiling is the backstop for an ad that shows but never
            // reports CLOSED: losing the splash mid-ad beats hanging on it.
            clearTimeout(timer);
            timer = setTimeout(() => finish(false), SHOW_CEILING_MS);
            try {
              ad.show();
            } catch {
              finish(false);
            }
          }),
          ad.addAdEventListener(AdEventType.ERROR, () => finish(false)),
          ad.addAdEventListener(AdEventType.CLOSED, () => finish(true)),
        );
        ad.load();
      })
      .catch(() => finish(false));
  });
}
