import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppHeader } from '@/components/layout/AppHeader';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { palette, spacing, typography, borderRadius } from '@/theme';
import { useColors } from '@/hooks/useColors';
import { useAccentColor } from '@/hooks/useAccentColor';
import { usePremiumStore } from '@/store/premiumStore';
import type { RootStackParamList } from '@/types';

const BENEFITS: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }[] = [
  { icon: 'speedometer-outline', title: 'Your live odds', body: 'See your real-time chance of an invitation against the current trend cutoff.' },
  { icon: 'trending-up-outline', title: 'Forecasts & trends', body: 'Cutoff forecasts, category trends, momentum and draw cadence — all from live IRCC data.' },
  { icon: 'options-outline', title: 'What-if scenarios', body: 'Model how French, a nomination or a higher CLB would move your score and odds.' },
  { icon: 'podium-outline', title: 'Where you stand', body: 'Your percentile, expected wait by score band, and best stream for your profile.' },
];

export default function PaywallScreen() {
  const c = useColors();
  const accent = useAccentColor();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const isPremium = usePremiumStore((s) => s.isPremium);
  const purchasing = usePremiumStore((s) => s.purchasing);
  const price = usePremiumStore((s) => s.price);
  const error = usePremiumStore((s) => s.error);
  const purchase = usePremiumStore((s) => s.purchase);
  const restore = usePremiumStore((s) => s.restore);

  // Close automatically once the entitlement is granted (purchase or restore).
  useEffect(() => {
    if (isPremium) nav.goBack();
  }, [isPremium, nav]);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.surfacePrimary }]} edges={['left', 'right']}>
      <AppHeader title="Unlock Analytics" variant="stack" />

      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        <View style={[s.hero, { backgroundColor: accent + '14', borderColor: accent }]}>
          <View style={[s.heroIcon, { backgroundColor: accent + '1F' }]}>
            <Ionicons name="analytics" size={30} color={accent} />
          </View>
          <Text style={[s.heroTitle, { color: c.textPrimary }]}>CRS Pulse Analytics</Text>
          <Text style={[s.heroSub, { color: c.textSecondary }]}>
            A one-time unlock for personalised, live Express Entry analytics. Yours forever — no subscription.
          </Text>
        </View>

        <Card style={s.benefits}>
          {BENEFITS.map((b, idx) => (
            <View
              key={b.title}
              style={[s.benefitRow, idx > 0 && { borderTopColor: c.border, borderTopWidth: StyleSheet.hairlineWidth }]}
            >
              <View style={[s.benefitIcon, { backgroundColor: accent + '14' }]}>
                <Ionicons name={b.icon} size={20} color={accent} />
              </View>
              <View style={s.benefitText}>
                <Text style={[s.benefitTitle, { color: c.textPrimary }]}>{b.title}</Text>
                <Text style={[s.benefitBody, { color: c.textSecondary }]}>{b.body}</Text>
              </View>
            </View>
          ))}
        </Card>

        {error && <Text style={[s.error, { color: palette.danger }]}>{error}</Text>}

        <Button
          title={purchasing ? 'Processing…' : price ? `Unlock for ${price}` : 'Unlock Analytics'}
          fullWidth
          loading={purchasing}
          onPress={purchase}
          icon={<Ionicons name="lock-open-outline" size={18} color={palette.white} />}
          style={s.cta}
        />

        <TouchableOpacity onPress={restore} disabled={purchasing} style={s.restore} accessibilityRole="button">
          <Text style={[s.restoreText, { color: accent }]}>Restore purchase</Text>
        </TouchableOpacity>

        <Text style={[s.legal, { color: c.textMuted }]}>
          One-time purchase billed through Google Play. Restores automatically on your other devices signed in to the
          same Google account. Analytics are estimates, not guarantees.
        </Text>
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

  benefits: { padding: 0, overflow: 'hidden' },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.base },
  benefitIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  benefitText: { flex: 1, gap: 2 },
  benefitTitle: { fontSize: typography.base, fontWeight: typography.bold },
  benefitBody: { fontSize: typography.xs, lineHeight: 16 },

  error: { fontSize: typography.sm, textAlign: 'center', fontWeight: typography.medium },
  cta: { marginTop: spacing.xs },
  restore: { alignItems: 'center', paddingVertical: spacing.sm },
  restoreText: { fontSize: typography.sm, fontWeight: typography.bold },
  legal: { fontSize: typography.xs, lineHeight: 16, textAlign: 'center', paddingHorizontal: spacing.sm },
});
