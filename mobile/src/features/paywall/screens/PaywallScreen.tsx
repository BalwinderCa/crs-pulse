import { useCallback, useEffect } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { AppHeader } from '@/components/layout/AppHeader';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { palette, spacing, typography, borderRadius } from '@/theme';
import { useColors } from '@/hooks/useColors';
import { useAccentColor } from '@/hooks/useAccentColor';
import { usePremiumStore } from '@/store/premiumStore';
import { PRIVACY_POLICY_URL, TERMS_OF_USE_URL } from '@/constants';
import type { RootStackParamList } from '@/types';

type Benefit = { icon: keyof typeof Ionicons.glyphMap; titleKey: string; bodyKey: string };

const BENEFITS: Benefit[] = [
  { icon: 'flag-outline',      titleKey: 'paywall.benefit0Title', bodyKey: 'paywall.benefit0Body' },
  { icon: 'options-outline',   titleKey: 'paywall.benefit1Title', bodyKey: 'paywall.benefit1Body' },
  { icon: 'trending-up-outline', titleKey: 'paywall.benefit2Title', bodyKey: 'paywall.benefit2Body' },
  { icon: 'podium-outline',    titleKey: 'paywall.benefit3Title', bodyKey: 'paywall.benefit3Body' },
];

export default function PaywallScreen() {
  const c = useColors();
  const accent = useAccentColor();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { t } = useTranslation();

  const isPremium = usePremiumStore((s) => s.isPremium);
  const purchasing = usePremiumStore((s) => s.purchasing);
  const price = usePremiumStore((s) => s.price);
  const error = usePremiumStore((s) => s.error);
  const purchase = usePremiumStore((s) => s.purchase);
  const restore = usePremiumStore((s) => s.restore);

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
        <View style={[s.hero, { backgroundColor: accent + '14', borderColor: accent }]}>
          <View style={[s.heroIcon, { backgroundColor: accent + '1F' }]}>
            <Ionicons name="analytics" size={30} color={accent} />
          </View>
          <Text style={[s.heroTitle, { color: c.textPrimary }]}>{t('paywall.heroTitle')}</Text>
          <Text style={[s.heroSub, { color: c.textSecondary }]}>{t('paywall.heroSub')}</Text>
        </View>

        <View style={[s.trustBadge, { borderColor: palette.success + '55', backgroundColor: palette.success + '12' }]}>
          <Ionicons name="checkmark-circle" size={15} color={palette.success} />
          <Text style={[s.trustText, { color: c.textSecondary }]}>{t('paywall.trustBadge')}</Text>
        </View>

        <Card style={s.benefits}>
          {BENEFITS.map((b, idx) => (
            <View
              key={b.titleKey}
              style={[s.benefitRow, idx > 0 && { borderTopColor: c.border, borderTopWidth: StyleSheet.hairlineWidth }]}
            >
              <View style={[s.benefitIcon, { backgroundColor: accent + '14' }]}>
                <Ionicons name={b.icon} size={20} color={accent} />
              </View>
              <View style={s.benefitText}>
                <Text style={[s.benefitTitle, { color: c.textPrimary }]}>{t(b.titleKey)}</Text>
                <Text style={[s.benefitBody, { color: c.textSecondary }]}>{t(b.bodyKey)}</Text>
              </View>
            </View>
          ))}
        </Card>

        {error && <Text style={[s.error, { color: palette.danger }]}>{error}</Text>}

        <Button
          title={ctaTitle}
          fullWidth
          loading={purchasing}
          onPress={purchase}
          icon={<Ionicons name="lock-open-outline" size={18} color={palette.white} />}
          style={s.cta}
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

        <Text style={[s.legal, { color: c.textMuted }]}>{t('paywall.legalText')}</Text>

        <View style={s.legalLinks}>
          <TouchableOpacity
            onPress={() => openUrl(TERMS_OF_USE_URL)}
            hitSlop={8}
            accessibilityRole="link"
            accessibilityLabel={t('paywall.termsOfUse')}
          >
            <Text style={[s.legalLink, { color: accent }]}>{t('paywall.termsOfUse')}</Text>
          </TouchableOpacity>
          <Text style={[s.legalDot, { color: c.textMuted }]}>·</Text>
          <TouchableOpacity
            onPress={() => openUrl(PRIVACY_POLICY_URL)}
            hitSlop={8}
            accessibilityRole="link"
            accessibilityLabel={t('paywall.privacyPolicy')}
          >
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

  hero: { alignItems: 'center', gap: spacing.xs, padding: spacing.lg, borderRadius: borderRadius.lg, borderWidth: 1 },
  heroIcon: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  heroTitle: { fontSize: typography.xl, fontWeight: typography.black, letterSpacing: -0.5, textAlign: 'center' },
  heroSub: { fontSize: typography.sm, lineHeight: 20, textAlign: 'center' },

  trustBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
                paddingVertical: spacing.sm, paddingHorizontal: spacing.base, borderRadius: borderRadius.md, borderWidth: 1 },
  trustText: { fontSize: typography.xs, fontWeight: typography.semibold },

  benefits: { padding: 0, overflow: 'hidden' },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.base },
  benefitIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  benefitText: { flex: 1, gap: 2 },
  benefitTitle: { fontSize: typography.base, fontWeight: typography.bold },
  benefitBody: { fontSize: typography.xs, lineHeight: 16 },

  error: { fontSize: typography.sm, textAlign: 'center', fontWeight: typography.medium },
  cta: { marginTop: spacing.xs },
  restore: { alignItems: 'center', justifyContent: 'center', minHeight: 44, paddingVertical: spacing.sm },
  restoreText: { fontSize: typography.sm, fontWeight: typography.bold },
  legal: { fontSize: typography.xs, lineHeight: 16, textAlign: 'center', paddingHorizontal: spacing.sm },
  legalLinks: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  legalLink: { fontSize: typography.xs, fontWeight: typography.bold, textDecorationLine: 'underline', paddingVertical: spacing.xs },
  legalDot: { fontSize: typography.xs },
});
