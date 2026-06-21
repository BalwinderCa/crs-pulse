import { useCallback, useEffect } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { AppHeader } from '@/components/layout/AppHeader';
import { Button } from '@/components/common/Button';
import { palette, spacing, typography, borderRadius } from '@/theme';
import { useColors } from '@/hooks/useColors';
import { useAccentColor } from '@/hooks/useAccentColor';
import { usePremiumStore } from '@/store/premiumStore';
import { PRIVACY_POLICY_URL, TERMS_OF_USE_URL } from '@/constants';
import type { RootStackParamList } from '@/types';

type Benefit = {
  icon: keyof typeof Ionicons.glyphMap;
  titleKey: string;
  bodyKey: string;
};

const BENEFITS: Benefit[] = [
  { icon: 'trending-up-outline', titleKey: 'paywall.benefit0Title', bodyKey: 'paywall.benefit0Body' },
  { icon: 'eye-off-outline',     titleKey: 'paywall.benefit2Title', bodyKey: 'paywall.benefit2Body' },
];

export default function PaywallScreen() {
  const c = useColors();
  const accent = useAccentColor();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { t } = useTranslation();

  const isPremium  = usePremiumStore((s) => s.isPremium);
  const purchasing = usePremiumStore((s) => s.purchasing);
  const price      = usePremiumStore((s) => s.price);
  const error      = usePremiumStore((s) => s.error);
  const purchase   = usePremiumStore((s) => s.purchase);
  const restore    = usePremiumStore((s) => s.restore);

  useEffect(() => {
    if (isPremium) nav.goBack();
  }, [isPremium, nav]);

  const openUrl = useCallback((url: string) => {
    Linking.openURL(url).catch(() => {});
  }, []);

  const ctaTitle = purchasing
    ? t('paywall.processing')
    : price
    ? t('paywall.unlockFor', { price })
    : t('paywall.unlockAnalytics');

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.surfacePrimary }]} edges={['left', 'right']}>
      <AppHeader title={t('paywall.title')} variant="stack" />

      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>

        {/* ── Hero ── */}
        <View style={[s.hero, { backgroundColor: accent + '1C', borderColor: accent + '55' }]}>
          <View style={[s.iconRing, { borderColor: accent + '70', backgroundColor: accent + '28' }]}>
            <Ionicons name="trending-up" size={36} color={accent} />
          </View>

          <Text style={[s.heroTitle, { color: c.textPrimary }]}>{t('paywall.heroTitle')}</Text>
          <Text style={[s.heroSub, { color: c.textSecondary }]}>{t('paywall.heroSub')}</Text>

          <View style={s.pillRow}>
            <View style={[s.pill, { backgroundColor: c.surfaceCard, borderColor: c.border }]}>
              <Ionicons name="flash-outline" size={11} color={accent} />
              <Text style={[s.pillText, { color: c.textSecondary }]}>{t('paywall.statA')}</Text>
            </View>
            <View style={[s.pill, { backgroundColor: c.surfaceCard, borderColor: c.border }]}>
              <Ionicons name="infinite-outline" size={11} color={accent} />
              <Text style={[s.pillText, { color: c.textSecondary }]}>{t('paywall.statC')}</Text>
            </View>
          </View>
        </View>

        {/* ── Trust strip ── */}
        <View style={[s.trustStrip, { backgroundColor: palette.success + '0F', borderColor: palette.success + '40' }]}>
          <Ionicons name="checkmark-circle" size={14} color={palette.success} />
          <Text style={[s.trustText, { color: c.textSecondary }]}>{t('paywall.trustBadge')}</Text>
          <View style={[s.trustDivider, { backgroundColor: palette.success + '40' }]} />
          <Ionicons name="lock-closed-outline" size={13} color={palette.success} />
          <Text style={[s.trustText, { color: c.textSecondary }]}>{t('paywall.trustOnce')}</Text>
        </View>

        {/* ── Benefits ── */}
        <View style={[s.benefitsCard, { backgroundColor: c.surfaceCard, borderColor: c.border }]}>
          {BENEFITS.map((b, idx) => (
            <View
              key={b.titleKey}
              style={[
                s.benefitRow,
                idx > 0 && { borderTopColor: c.border, borderTopWidth: StyleSheet.hairlineWidth },
              ]}
            >
              <View style={[s.benefitIconWrap, { backgroundColor: accent + '12' }]}>
                <Ionicons name={b.icon} size={20} color={accent} />
              </View>
              <View style={s.benefitText}>
                <Text style={[s.benefitTitle, { color: c.textPrimary }]}>{t(b.titleKey)}</Text>
                <Text style={[s.benefitBody, { color: c.textSecondary }]}>{t(b.bodyKey)}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── Social proof ── */}
        <Text style={[s.socialProof, { color: c.textMuted }]}>{t('paywall.socialProof')}</Text>

        {error && <Text style={[s.errorText, { color: palette.danger }]}>{error}</Text>}

        {/* ── CTA ── */}
        <View style={s.ctaSection}>
          <Button
            title={ctaTitle}
            fullWidth
            loading={purchasing}
            onPress={purchase}
            icon={<Ionicons name="lock-open-outline" size={18} color={palette.white} />}
          />
          <View style={s.ctaMeta}>
            <Ionicons name="shield-checkmark-outline" size={12} color={c.textMuted} />
            <Text style={[s.ctaMetaText, { color: c.textMuted }]}>{t('paywall.ctaMeta')}</Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={restore}
          disabled={purchasing}
          style={s.restore}
          accessibilityRole="button"
          accessibilityLabel={t('paywall.restorePurchase')}
        >
          <Text style={[s.restoreText, { color: accent }]}>{t('paywall.restorePurchase')}</Text>
        </TouchableOpacity>

        <Text style={[s.legal, { color: c.textMuted }]}>{t('paywall.legalText')}</Text>

        <View style={s.legalLinks}>
          <TouchableOpacity onPress={() => openUrl(TERMS_OF_USE_URL)} hitSlop={8} accessibilityRole="link">
            <Text style={[s.legalLink, { color: accent }]}>{t('paywall.termsOfUse')}</Text>
          </TouchableOpacity>
          <Text style={[s.legalDot, { color: c.textMuted }]}>·</Text>
          <TouchableOpacity onPress={() => openUrl(PRIVACY_POLICY_URL)} hitSlop={8} accessibilityRole="link">
            <Text style={[s.legalLink, { color: accent }]}>{t('paywall.privacyPolicy')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  body: { padding: spacing.base, gap: spacing.md, paddingBottom: spacing.xl },

  /* Hero */
  hero: {
    alignItems: 'center',
    gap: spacing.sm + 2,
    paddingVertical: spacing.xl + 4,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
  },
  iconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  heroTitle: {
    fontSize: typography['2xl'],
    fontWeight: typography.black,
    letterSpacing: -0.7,
    textAlign: 'center',
    lineHeight: 31,
  },
  heroSub: {
    fontSize: typography.sm,
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: spacing.xs,
  },
  pillRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pillText: { fontSize: 11, fontWeight: typography.semibold },

  /* Trust strip */
  trustStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  trustText: { fontSize: typography.xs, fontWeight: typography.semibold },
  trustDivider: { width: 1, height: 12, marginHorizontal: spacing.xs },

  /* Benefits */
  benefitsCard: {
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.base },
  benefitIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  benefitText: { flex: 1, gap: 3 },
  benefitTitle: { fontSize: typography.base, fontWeight: typography.bold },
  benefitBody: { fontSize: typography.xs, lineHeight: 17 },

  /* Social proof */
  socialProof: { fontSize: typography.xs, lineHeight: 17, textAlign: 'center', paddingHorizontal: spacing.lg },

  errorText: { fontSize: typography.sm, textAlign: 'center', fontWeight: typography.medium },

  /* CTA */
  ctaSection: { gap: spacing.sm },
  ctaMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  ctaMetaText: { fontSize: typography.xs, fontWeight: typography.medium },

  restore: { alignItems: 'center', justifyContent: 'center', minHeight: 44 },
  restoreText: { fontSize: typography.sm, fontWeight: typography.bold },

  legal: { fontSize: typography.xs, lineHeight: 16, textAlign: 'center', paddingHorizontal: spacing.sm },
  legalLinks: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  legalLink: { fontSize: typography.xs, fontWeight: typography.bold, textDecorationLine: 'underline', paddingVertical: spacing.xs },
  legalDot: { fontSize: typography.xs },
});
