import { useEffect, useState } from 'react';
import { Image, Platform, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  ADMOB_BANNER_AD_UNIT,
  ADMOB_NATIVE_AD_UNIT,
  MONETIZATION_ENABLED,
} from '@/constants';
import { borderRadius, palette, spacing, typography } from '@/theme';
import { useColors } from '@/hooks/useColors';

// `require` is provided by the Metro runtime; declare it for the TS compiler
// (the project's tsconfig pulls no node types).
declare const require: (module: string) => unknown;

// react-native-google-mobile-ads is a NATIVE module — it only exists in a
// custom dev/EAS build, never in Expo Go or a JS-only client. Require it lazily
// and swallow the failure so those environments render nothing rather than
// crash. Until the app is rebuilt with the new native module, AdBanner no-ops.
interface LoadedNativeAd {
  headline: string;
  body: string;
  callToAction: string;
  advertiser: string | null;
  icon: { url: string } | null;
  destroy: () => void;
}

interface AdsModule {
  BannerAd: React.ComponentType<{
    unitId: string;
    size: string;
    onAdFailedToLoad?: () => void;
  }>;
  BannerAdSize: { ANCHORED_ADAPTIVE_BANNER: string };
  TestIds: { ADAPTIVE_BANNER?: string; BANNER?: string; NATIVE?: string };
  NativeAd?: { createForAdRequest: (unitId: string) => Promise<LoadedNativeAd> };
  NativeAdView?: React.ComponentType<{
    nativeAd: LoadedNativeAd;
    style?: object;
    children: React.ReactNode;
  }>;
  NativeAsset?: React.ComponentType<{ assetType: string; children: React.ReactElement }>;
  NativeAssetType?: Record<string, string>;
}

let ads: AdsModule | null = null;
try {
  ads = require('react-native-google-mobile-ads') as AdsModule;
} catch {
  ads = null;
}

const BANNER_UNIT_ID =
  __DEV__ && ads?.TestIds
    ? ads.TestIds.ADAPTIVE_BANNER ?? ads.TestIds.BANNER ?? ''
    : Platform.OS === 'ios'
      ? ADMOB_BANNER_AD_UNIT.ios
      : ADMOB_BANNER_AD_UNIT.android;

// Native ads only run when a native-format unit id is configured for the
// platform; otherwise we keep serving the plain banner. In __DEV__ the SDK's
// test native unit is used, but only if a real one is configured for release —
// so an unconfigured platform behaves the same in dev and prod.
const NATIVE_CONFIGURED =
  Platform.OS === 'ios' ? !!ADMOB_NATIVE_AD_UNIT.ios : !!ADMOB_NATIVE_AD_UNIT.android;
const NATIVE_UNIT_ID = !NATIVE_CONFIGURED
  ? ''
  : __DEV__
    ? ads?.TestIds?.NATIVE ?? ''
    : Platform.OS === 'ios'
      ? ADMOB_NATIVE_AD_UNIT.ios
      : ADMOB_NATIVE_AD_UNIT.android;

/**
 * A single AdMob ad slot — a native ad rendered in our own card when a native
 * ad unit is configured for the platform, otherwise an anchored-adaptive
 * banner. Renders nothing when monetization is off, when the native module is
 * unavailable, or when the ad fails to fill.
 */
export function AdBanner() {
  const [failed, setFailed] = useState(false);

  if (!MONETIZATION_ENABLED || !ads || failed) return null;
  if (NATIVE_UNIT_ID && ads.NativeAd && ads.NativeAdView) return <NativeAdCard />;

  if (!BANNER_UNIT_ID || !ads.BannerAd || !ads.BannerAdSize) return null;
  const { BannerAd, BannerAdSize } = ads;
  return (
    <View style={s.wrap}>
      <BannerAd
        unitId={BANNER_UNIT_ID}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        onAdFailedToLoad={() => setFailed(true)}
      />
    </View>
  );
}

function NativeAdCard() {
  const { t } = useTranslation();
  const colors = useColors();
  const [ad, setAd] = useState<LoadedNativeAd | null>(null);

  useEffect(() => {
    let loaded: LoadedNativeAd | null = null;
    let cancelled = false;
    ads!.NativeAd!.createForAdRequest(NATIVE_UNIT_ID)
      .then((next) => {
        loaded = next;
        if (cancelled) next.destroy();
        else setAd(next);
      })
      .catch(() => undefined); // no fill — the slot just stays empty
    return () => {
      cancelled = true;
      loaded?.destroy();
    };
  }, []);

  if (!ad) return null;

  const AdView = ads!.NativeAdView!;
  const Asset = ads!.NativeAsset!;
  const assetTypes = ads!.NativeAssetType ?? {};
  return (
    <View style={s.wrap}>
      <AdView
        nativeAd={ad}
        style={[s.card, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}
      >
        <View style={s.row}>
          {ad.icon ? (
            <Asset assetType={assetTypes.ICON ?? 'icon'}>
              <Image source={{ uri: ad.icon.url }} style={s.icon} />
            </Asset>
          ) : null}
          <View style={s.copy}>
            <Asset assetType={assetTypes.HEADLINE ?? 'headline'}>
              <Text numberOfLines={1} style={[s.headline, { color: colors.textPrimary }]}>
                {ad.headline}
              </Text>
            </Asset>
            <Asset assetType={assetTypes.BODY ?? 'body'}>
              <Text numberOfLines={2} style={[s.body, { color: colors.textSecondary }]}>
                {ad.body}
              </Text>
            </Asset>
          </View>
          {/* AdMob policy: the ad must always carry a visible "Sponsored" label. */}
          <Text style={[s.badge, { color: colors.textMuted, borderColor: colors.border }]}>
            {t('common.sponsored')}
          </Text>
        </View>
        {ad.callToAction ? (
          <Asset assetType={assetTypes.CALL_TO_ACTION ?? 'callToAction'}>
            <Text style={s.cta}>{ad.callToAction}</Text>
          </Asset>
        ) : null}
      </AdView>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', marginVertical: spacing.sm },
  card: {
    width: '100%',
    borderRadius: borderRadius.md,
    borderWidth: 0.3,
    padding: spacing.md,
    gap: spacing.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  icon: { width: 40, height: 40, borderRadius: borderRadius.sm },
  copy: { flex: 1 },
  headline: { fontSize: typography.base, fontWeight: typography.semibold },
  body: { fontSize: typography.sm },
  badge: {
    fontSize: typography.xs,
    borderWidth: 0.5,
    borderRadius: borderRadius.xs,
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
  },
  cta: {
    color: palette.white,
    backgroundColor: palette.blueMid,
    fontSize: typography.sm,
    fontWeight: typography.semibold,
    textAlign: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
});
