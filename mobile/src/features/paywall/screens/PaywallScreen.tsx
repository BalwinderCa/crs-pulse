import { useCallback, useEffect } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { palette, spacing, typography, borderRadius } from '@/theme';
import { useColors } from '@/hooks/useColors';
import { useAccentColor } from '@/hooks/useAccentColor';
import { usePremiumStore } from '@/store/premiumStore';
import { PRIVACY_POLICY_URL, TERMS_OF_USE_URL, MONETIZATION_ENABLED } from '@/constants';
import type { RootStackParamList } from '@/types';

type Feature = {
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  titleKey: string;
  bodyKey: string;
};

// Real entitlements behind the one-time "Your Plan" unlock — each given a
// distinct tint so the list scans quickly (checkmarks stay a single green).
const FEATURES: Feature[] = [
  { icon: 'speedometer-outline', tint: palette.blue,      titleKey: 'paywall.feat0Title', bodyKey: 'paywall.feat0Body' },
  { icon: 'layers-outline',      tint: palette.success,   titleKey: 'paywall.feat1Title', bodyKey: 'paywall.feat1Body' },
  { icon: 'sparkles-outline',    tint: palette.canadaRed, titleKey: 'paywall.feat3Title', bodyKey: 'paywall.feat3Body' },
  { icon: 'infinite-outline',    tint: palette.blueLight, titleKey: 'paywall.feat4Title', bodyKey: 'paywall.feat4Body' },
];

export default function PaywallScreen() {
  const c = useColors();
  const accent = useAccentColor();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { t } = useTranslation();

  const isPremium        = usePremiumStore((s) => s.isPremium);
  const premiumLoaded    = usePremiumStore((s) => s.loaded);
  const billingAvailable = usePremiumStore((s) => s.billingAvailable);
  const purchasing       = usePremiumStore((s) => s.purchasing);
  const price            = usePremiumStore((s) => s.price);
  const error            = usePremiumStore((s) => s.error);
  const purchase         = usePremiumStore((s) => s.purchase);
  const restore          = usePremiumStore((s) => s.restore);

  useEffect(() => {
    // Dismiss once entitlement is granted, OR when there is no purchasable
    // product on this device (iOS without StoreKit, emulator, billing outage).
    // In that case the analytics gate already fails OPEN, so a paywall here is a
    // dead end — and showing a non-functional purchase flow is an App Review
    // rejection (Guideline 2.1). Defence-in-depth: the entry CTAs are already
    // hidden when billing is unavailable, this guards any direct navigation too.
    if (!MONETIZATION_ENABLED || isPremium || (premiumLoaded && !billingAvailable)) nav.goBack();
  }, [isPremium, premiumLoaded, billingAvailable, nav]);

  const openUrl = useCallback((url: string) => {
    Linking.openURL(url).catch(() => {});
  }, []);

  const ctaTitle = purchasing
    ? t('paywall.processing')
    : price
    ? t('paywall.unlockFor', { price })
    : t('paywall.unlockAnalytics');

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.surfacePrimary }]} edges={['top', 'left', 'right']}>
      {/* ── Close ── */}
      <View style={s.topBar}>
        <TouchableOpacity
          onPress={() => nav.goBack()}
          style={[s.closeBtn, { backgroundColor: c.surfaceCard, borderColor: c.border }]}
          accessibilityRole="button"
          accessibilityLabel={t('paywall.close')}
          hitSlop={8}
        >
          <Text style={[s.closeText, { color: c.textSecondary }]}>{t('paywall.close')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        {/* ── Hero ── */}
        <View style={s.hero}>
          <View style={[s.iconRing, { backgroundColor: accent + '1F', borderColor: accent + '55' }]}>
            <Ionicons name="rocket" size={34} color={accent} />
          </View>
          <Text style={[s.heroTitle, { color: c.textPrimary }]}>{t('paywall.heroTitle')}</Text>
          <Text style={[s.heroSub, { color: c.textSecondary }]}>{t('paywall.heroLead')}</Text>
        </View>

        {/* ── Features ── */}
        <View style={[s.card, { backgroundColor: c.surfaceCard, borderColor: c.border }]}>
          {FEATURES.map((f, idx) => (
            <View
              key={f.titleKey}
              style={[
                s.row,
                idx > 0 && { borderTopColor: c.border, borderTopWidth: StyleSheet.hairlineWidth },
              ]}
            >
              <View style={[s.iconWrap, { backgroundColor: f.tint + '1A' }]}>
                <Ionicons name={f.icon} size={20} color={f.tint} />
              </View>
              <View style={s.rowText}>
                <Text style={[s.rowTitle, { color: c.textPrimary }]}>{t(f.titleKey)}</Text>
                <Text style={[s.rowBody, { color: c.textSecondary }]}>{t(f.bodyKey)}</Text>
              </View>
              <Ionicons name="checkmark-circle" size={20} color={palette.success} />
            </View>
          ))}
        </View>

        {error && <Text style={[s.errorText, { color: palette.danger }]}>{error}</Text>}
      </ScrollView>

      {/* ── Sticky CTA ── */}
      <View style={[s.footer, { borderTopColor: c.border, backgroundColor: c.surfacePrimary }]}>
        <Button
          title={ctaTitle}
          fullWidth
          loading={purchasing}
          onPress={purchase}
          icon={<Ionicons name="lock-open-outline" size={18} color={palette.white} />}
        />

        <TouchableOpacity
          onPress={restore}
          disabled={purchasing}
          style={s.restore}
          accessibilityRole="button"
          accessibilityLabel={t('paywall.restorePurchase')}
        >
          <Text style={[s.restoreText, { color: accent }]}>{t('paywall.restorePurchase')}</Text>
        </TouchableOpacity>

        <Text style={[s.tagline, { color: c.textMuted }]}>{t('paywall.tagline')}</Text>

        <View style={s.legalLinks}>
          <TouchableOpacity onPress={() => openUrl(TERMS_OF_USE_URL)} hitSlop={8} accessibilityRole="link">
            <Text style={[s.legalLink, { color: c.textMuted }]}>{t('paywall.termsOfUse')}</Text>
          </TouchableOpacity>
          <Text style={[s.legalDot, { color: c.textMuted }]}>·</Text>
          <TouchableOpacity onPress={() => openUrl(PRIVACY_POLICY_URL)} hitSlop={8} accessibilityRole="link">
            <Text style={[s.legalLink, { color: c.textMuted }]}>{t('paywall.privacyPolicy')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },

  /* Close */
  topBar: { alignItems: 'flex-end', paddingHorizontal: spacing.base, paddingTop: spacing.sm },
  closeBtn: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xs + 2,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  closeText: { fontSize: typography.sm, fontWeight: typography.semibold },

  body: { paddingHorizontal: spacing.base, paddingTop: spacing.sm, paddingBottom: spacing.lg, gap: spacing.lg },

  /* Hero */
  hero: { alignItems: 'center', gap: spacing.sm + 2, paddingTop: spacing.sm },
  iconRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: typography.xl,
    fontWeight: typography.black,
    letterSpacing: -0.5,
    textAlign: 'center',
    lineHeight: 29,
    paddingHorizontal: spacing.sm,
  },
  heroSub: {
    fontSize: typography.sm,
    lineHeight: 21,
    textAlign: 'center',
    paddingHorizontal: spacing.base,
  },

  /* Features */
  card: { borderRadius: borderRadius.lg, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.base },
  iconWrap: { width: 40, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontSize: typography.base, fontWeight: typography.bold },
  rowBody: { fontSize: typography.xs, lineHeight: 17 },

  errorText: { fontSize: typography.sm, textAlign: 'center', fontWeight: typography.medium },

  /* Footer / CTA */
  footer: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing.base,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  restore: { alignItems: 'center', justifyContent: 'center', minHeight: 40 },
  restoreText: { fontSize: typography.sm, fontWeight: typography.bold },

  tagline: { fontSize: typography.xs, textAlign: 'center', fontWeight: typography.medium },
  legalLinks: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  legalLink: { fontSize: typography.xs, fontWeight: typography.semibold, textDecorationLine: 'underline' },
  legalDot: { fontSize: typography.xs },
});
