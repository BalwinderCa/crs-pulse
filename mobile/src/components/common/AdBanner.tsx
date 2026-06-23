import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { usePremiumStore } from '@/store/premiumStore';
import { ADMOB_BANNER_AD_UNIT } from '@/constants';
import { spacing } from '@/theme';

// `require` is provided by the Metro runtime; declare it for the TS compiler
// (the project's tsconfig pulls no node types).
declare const require: (module: string) => unknown;

// react-native-google-mobile-ads is a NATIVE module — it only exists in a
// custom dev/EAS build, never in Expo Go or a JS-only client. Require it lazily
// and swallow the failure so those environments render nothing rather than
// crash. Until the app is rebuilt with the new native module, AdBanner no-ops.
interface AdsModule {
  BannerAd: React.ComponentType<{
    unitId: string;
    size: string;
    onAdFailedToLoad?: () => void;
  }>;
  BannerAdSize: { ANCHORED_ADAPTIVE_BANNER: string };
  TestIds: { ADAPTIVE_BANNER?: string; BANNER?: string };
}

let ads: AdsModule | null = null;
try {
  ads = require('react-native-google-mobile-ads') as AdsModule;
} catch {
  ads = null;
}

const UNIT_ID =
  __DEV__ && ads?.TestIds
    ? ads.TestIds.ADAPTIVE_BANNER ?? ads.TestIds.BANNER ?? ''
    : Platform.OS === 'ios'
      ? ADMOB_BANNER_AD_UNIT.ios
      : ADMOB_BANNER_AD_UNIT.android;

/**
 * A single AdMob anchored-adaptive banner. Renders nothing for Premium users
 * (the "ad-free" entitlement), before Premium has resolved (so a paying user
 * never sees an ad flash), when the native module is unavailable, or when the
 * ad fails to fill.
 */
export function AdBanner() {
  const isPremium = usePremiumStore((s) => s.isPremium);
  const premiumLoaded = usePremiumStore((s) => s.loaded);
  const [failed, setFailed] = useState(false);

  // UNIT_ID is empty in a release build whose EXPO_PUBLIC_ADMOB_BANNER_* env
  // vars weren't set — render nothing rather than fall back to Google's test
  // ad units (an AdMob policy violation). __DEV__ always has a TestIds unit.
  if (!UNIT_ID || !ads?.BannerAd || !ads.BannerAdSize || !premiumLoaded || isPremium || failed) {
    return null;
  }

  const { BannerAd, BannerAdSize } = ads;
  return (
    <View style={s.wrap}>
      <BannerAd
        unitId={UNIT_ID}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        onAdFailedToLoad={() => setFailed(true)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', marginVertical: spacing.sm },
});
