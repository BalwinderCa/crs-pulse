import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from '@/components/common/AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import type { PurchasesPackage } from 'react-native-purchases';
import { Button } from '@/components/common/Button';
import { palette, spacing, typography, borderRadius } from '@/theme';
import { useColors, useResolvedScheme } from '@/hooks/useColors';
import { useAccentColor } from '@/hooks/useAccentColor';
import { PRIVACY_POLICY_URL, TERMS_OF_USE_URL } from '@/constants';
import { isProOn, purchasesAvailable, purchasesModule, useProStore } from '@/store/proStore';
import { toPlans, type PlanPackage } from '../plans';

const BENEFITS = [
  { icon: 'time', title: 'pro.benefitTimes', desc: 'pro.benefitTimesDesc' },
  { icon: 'people', title: 'pro.benefitAor', desc: 'pro.benefitAorDesc' },
  { icon: 'ban', title: 'pro.benefitAds', desc: 'pro.benefitAdsDesc' },
  { icon: 'color-palette', title: 'pro.benefitLook', desc: 'pro.benefitLookDesc' },
] as const;

const STORE = Platform.OS === 'ios' ? 'App Store' : 'Google Play';
const MANAGE_URL = Platform.OS === 'ios'
  ? 'https://apps.apple.com/account/subscriptions'
  : 'https://play.google.com/store/account/subscriptions';

// Development builds have no RevenueCat key: sample plans so the design can be reviewed. Never in a release build.
const SAMPLE: PlanPackage[] = [
  { identifier: '$rc_monthly', packageType: 'MONTHLY', product: { identifier: 'm', price: 3.99, priceString: 'CA$3.99',
    introPrice: { price: 0, periodUnit: 'WEEK', periodNumberOfUnits: 1 } } },
  { identifier: '$rc_annual', packageType: 'ANNUAL', product: { identifier: 'y', price: 24.99, priceString: 'CA$24.99',
    pricePerMonthString: 'CA$2.08', introPrice: { price: 0, periodUnit: 'WEEK', periodNumberOfUnits: 1 } } },
];

/** Pro paywall: what Pro unlocks, the plans, how the free week works, buy and restore. */
export default function ProScreen() {
  const c = useColors();
  const dark = useResolvedScheme() === 'dark';
  const accent = useAccentColor();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { active, trialEnds } = useProStore();
  const appTrial = !active && isProOn({ active, trialEnds });
  const appTrialDays = trialEnds ? Math.max(0, Math.ceil((trialEnds - Date.now()) / 86_400_000)) : 0;

  const [packages, setPackages] = useState<PlanPackage[] | null>(null);
  const [ineligible, setIneligible] = useState<Set<string>>(new Set());
  const [chosen, setChosen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const canBuy = purchasesAvailable();

  useEffect(() => {
    if (active) return;
    const P = purchasesModule();
    if (!P) { if (__DEV__) setPackages(SAMPLE); return; }
    P.getOfferings()
      .then(async (o) => {
        const list = (o.current?.availablePackages ?? []) as unknown as PlanPackage[];
        setPackages(list.length || !__DEV__ ? list : SAMPLE);
        // iOS only knows trial eligibility on request; someone who already had a free week sees the plain price.
        if (Platform.OS === 'ios' && list.length) {
          const res = await P.checkTrialOrIntroductoryPriceEligibility(list.map((p) => p.product.identifier)).catch(() => ({}));
          setIneligible(new Set(Object.entries(res).filter(([, v]) => (v as { status: number }).status === 1).map(([k]) => k)));
        }
      })
      // A dev build without the native module (or store products) still shows the design.
      .catch(() => setPackages(__DEV__ ? SAMPLE : []));
  }, [active]);

  const plans = useMemo(() => toPlans(packages ?? []).map((p) => (ineligible.has(p.productId) ? { ...p, trialDays: null } : p)),
    [packages, ineligible]);
  useEffect(() => { if (!chosen && plans[0]) setChosen(plans[0].id); }, [plans, chosen]);
  const plan = plans.find((p) => p.id === chosen) ?? null;
  const trial = plan?.trialDays ?? null;

  const buy = async () => {
    const P = purchasesModule();
    const pkg = (packages as unknown as PurchasesPackage[] | null)?.find((p) => p.identifier === chosen);
    if (!P || !pkg) return;
    setBusy(true);
    try {
      await P.purchasePackage(pkg);
      Toast.show({ type: 'success', text1: t('pro.welcome') });
      navigation.goBack();
    } catch (e) {
      if (!(e as { userCancelled?: boolean }).userCancelled) Toast.show({ type: 'error', text1: t('pro.buyFailed') });
    } finally {
      setBusy(false);
    }
  };

  const restore = async () => {
    const P = purchasesModule();
    if (!P) return;
    setBusy(true);
    try {
      const info = await P.restorePurchases();
      const ok = !!info.entitlements.active.pro;
      Toast.show({ type: ok ? 'success' : 'info', text1: t(ok ? 'pro.restored' : 'pro.nothingToRestore') });
    } catch {
      Toast.show({ type: 'error', text1: t('pro.restoreFailed') });
    } finally {
      setBusy(false);
    }
  };

  const showPlans = !active && plans.length > 0;

  return (
    <View style={[s.wrap, { backgroundColor: c.surfacePrimary }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[s.hero, { paddingTop: insets.top + 56, backgroundColor: accent + (dark ? '1F' : '12') }]}>
          <View style={[s.glow, { top: insets.top + 12, backgroundColor: accent + (dark ? '22' : '14') }]} />
          <View style={[s.badgeIcon, { backgroundColor: accent }]}>
            <MaterialCommunityIcons name="crown" size={34} color={palette.white} />
          </View>
          <View style={[s.proTag, { borderColor: accent + '66', backgroundColor: c.surfaceCard }]}>
            <Text style={[s.proTagTxt, { color: accent }]}>{t('pro.tag')}</Text>
          </View>
          <Text style={[s.headline, { color: c.textPrimary }]}>{active ? t('pro.activeHeadline') : t('pro.headline')}</Text>
          <Text style={[s.subhead, { color: c.textSecondary }]}>{active ? t('pro.statusActive') : t('pro.subhead')}</Text>
          {appTrial && (
            <View style={[s.trialPill, { backgroundColor: c.surfaceCard, borderColor: c.border }]}>
              <Ionicons name="hourglass-outline" size={13} color={accent} />
              <Text style={[s.trialPillTxt, { color: c.textSecondary }]}>{t('pro.statusTrial', { count: appTrialDays })}</Text>
            </View>
          )}
        </View>

        <View style={s.body}>
          {/* What you get */}
          <View style={[s.card, { backgroundColor: c.surfaceCard, borderColor: c.border }]}>
            {BENEFITS.map((b, i) => (
              <View key={b.title} style={[s.benefit, i > 0 && { borderTopColor: c.border, borderTopWidth: StyleSheet.hairlineWidth }]}>
                <View style={[s.benefitIcon, { backgroundColor: accent + '18' }]}>
                  <Ionicons name={b.icon} size={18} color={accent} />
                </View>
                <View style={s.flex}>
                  <Text style={[s.benefitTitle, { color: c.textPrimary }]}>{t(b.title)}</Text>
                  <Text style={[s.benefitDesc, { color: c.textMuted }]}>{t(b.desc)}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Plans */}
          {showPlans && (
            <View style={s.plans}>
              {plans.map((p) => {
                const on = p.id === chosen;
                return (
                  <TouchableOpacity key={p.id} ph-label={`pro-plan-${p.yearly ? 'yearly' : 'monthly'}`} activeOpacity={0.85}
                    onPress={() => setChosen(p.id)} accessibilityRole="radio" accessibilityState={{ selected: on }}
                    style={[s.plan, { backgroundColor: on ? accent + '10' : c.surfaceCard, borderColor: on ? accent : c.border }]}>
                    <View style={[s.radio, { borderColor: on ? accent : c.textMuted }]}>
                      {on && <View style={[s.radioDot, { backgroundColor: accent }]} />}
                    </View>
                    <View style={s.flex}>
                      <Text style={[s.planName, { color: c.textPrimary }]}>{t(p.yearly ? 'pro.yearly' : 'pro.monthly')}</Text>
                      <Text style={[s.planSub, { color: c.textMuted }]}>
                        {p.yearly && p.perMonth ? t('pro.perMonthBilledYearly', { price: p.perMonth }) : t('pro.billedMonthly')}
                      </Text>
                    </View>
                    <View style={s.planRight}>
                      <Text style={[s.planPrice, { color: c.textPrimary }]}>{p.price}</Text>
                      <Text style={[s.planPer, { color: c.textMuted }]}>{t(p.yearly ? 'pro.perYear' : 'pro.perMonth')}</Text>
                    </View>
                    {p.savePct !== null && (
                      <View style={[s.save, { backgroundColor: accent }]}>
                        <Text style={s.saveTxt}>{t('pro.save', { pct: p.savePct })}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* How the free week works */}
          {showPlans && trial !== null && plan && (
            <View style={[s.card, { backgroundColor: c.surfaceCard, borderColor: c.border }]}>
              <Text style={[s.timelineTitle, { color: c.textPrimary }]}>{t('pro.howTrialWorks', { count: trial })}</Text>
              {[
                { icon: 'lock-open' as const, when: t('pro.today'), what: t('pro.todayDesc') },
                { icon: 'notifications' as const, when: t('pro.dayN', { n: Math.max(1, trial - 1) }), what: t('pro.cancelBefore', { store: STORE }) },
                { icon: 'star' as const, when: t('pro.dayN', { n: trial }), what: t(plan.yearly ? 'pro.startsYearly' : 'pro.startsMonthly', { price: plan.price }) },
              ].map((step, i, all) => (
                <View key={step.icon} style={s.step}>
                  <View style={s.stepRail}>
                    <View style={[s.stepDot, { backgroundColor: i === 0 ? accent : accent + '22' }]}>
                      <Ionicons name={step.icon} size={13} color={i === 0 ? palette.white : accent} />
                    </View>
                    {i < all.length - 1 && <View style={[s.stepLine, { backgroundColor: accent + '33' }]} />}
                  </View>
                  <View style={[s.flex, s.stepText]}>
                    <Text style={[s.stepWhen, { color: c.textPrimary }]}>{step.when}</Text>
                    <Text style={[s.stepWhat, { color: c.textMuted }]}>{step.what}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {!active && !showPlans && (
            packages === null && canBuy
              ? <ActivityIndicator color={accent} style={s.loading} />
              : <Text style={[s.note, { color: c.textMuted }]}>{t(canBuy ? 'pro.noPlans' : 'pro.unavailable')}</Text>
          )}
        </View>
      </ScrollView>

      {/* Close */}
      <TouchableOpacity ph-label="pro-close" onPress={() => navigation.goBack()} hitSlop={10} accessibilityRole="button"
        accessibilityLabel={t('common.close')} style={[s.close, { top: insets.top + 10, backgroundColor: c.surfaceCard, borderColor: c.border }]}>
        <Ionicons name="close" size={20} color={c.textSecondary} />
      </TouchableOpacity>

      {/* Pinned action */}
      <View style={[s.bar, { paddingBottom: insets.bottom + spacing.sm, backgroundColor: c.surfacePrimary, borderTopColor: c.border }]}>
        {active ? (
          <Button title={t('pro.manage')} variant="outline" fullWidth size="lg" onPress={() => { void Linking.openURL(MANAGE_URL); }} />
        ) : showPlans ? (
          <>
            <Button ph-label="pro-buy" title={trial !== null ? t('pro.startTrial', { count: trial }) : t('pro.subscribe')}
              fullWidth size="lg" onPress={buy} disabled={busy || !chosen || !canBuy} loading={busy} />
            <Text style={[s.reassure, { color: c.textMuted }]}>
              {trial !== null ? t('pro.noPaymentNow') : t('pro.cancelAnytime')}
            </Text>
          </>
        ) : null}
        <View style={s.links}>
          {canBuy && !active && (
            <TouchableOpacity ph-label="pro-restore" onPress={restore} disabled={busy} hitSlop={8}>
              <Text style={[s.link, { color: c.textSecondary }]}>{t('pro.restore')}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => { void Linking.openURL(TERMS_OF_USE_URL); }} hitSlop={8}>
            <Text style={[s.link, { color: c.textSecondary }]}>{t('pro.terms')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { void Linking.openURL(PRIVACY_POLICY_URL); }} hitSlop={8}>
            <Text style={[s.link, { color: c.textSecondary }]}>{t('pro.privacy')}</Text>
          </TouchableOpacity>
        </View>
        {showPlans && <Text style={[s.legal, { color: c.textMuted }]}>{t('pro.autoRenew')}</Text>}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1 },
  flex: { flex: 1, minWidth: 0 },
  hero: { alignItems: 'center', paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, overflow: 'hidden',
          borderBottomLeftRadius: 32, borderBottomRightRadius: 32, marginBottom: spacing.lg },
  glow: { position: 'absolute', width: 180, height: 180, borderRadius: 90 },
  badgeIcon: { width: 68, height: 68, borderRadius: 22, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-6deg' }],
               shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  proTag: { marginTop: spacing.base, borderWidth: 1, borderRadius: borderRadius.full, paddingHorizontal: 10, paddingVertical: 3 },
  proTagTxt: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  headline: { marginTop: spacing.md, fontSize: 28, lineHeight: 34, fontWeight: '800', textAlign: 'center', letterSpacing: -0.4 },
  subhead: { marginTop: spacing.sm, fontSize: typography.base, lineHeight: 22, textAlign: 'center' },
  trialPill: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.md, borderWidth: StyleSheet.hairlineWidth,
               borderRadius: borderRadius.full, paddingHorizontal: spacing.md, paddingVertical: 5 },
  trialPillTxt: { fontSize: typography.xs, fontWeight: typography.semibold },
  body: { paddingHorizontal: spacing.base, gap: spacing.lg },
  card: { borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: spacing.base, paddingVertical: spacing.xs },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  benefitIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  benefitTitle: { fontSize: typography.base, fontWeight: typography.bold },
  benefitDesc: { fontSize: typography.sm, lineHeight: 18, marginTop: 1 },
  plans: { gap: spacing.md },
  plan: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: 18, borderWidth: 2, padding: spacing.base },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 11, height: 11, borderRadius: 6 },
  planName: { fontSize: typography.base, fontWeight: typography.bold },
  planSub: { fontSize: typography.sm, marginTop: 2 },
  planRight: { alignItems: 'flex-end' },
  planPrice: { fontSize: typography.lg, fontWeight: '800' },
  planPer: { fontSize: typography.xs },
  save: { position: 'absolute', top: -11, right: 14, borderRadius: borderRadius.full, paddingHorizontal: 10, paddingVertical: 3 },
  saveTxt: { color: palette.white, fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
  timelineTitle: { fontSize: typography.base, fontWeight: typography.bold, paddingTop: spacing.md, paddingBottom: spacing.sm },
  step: { flexDirection: 'row', gap: spacing.md },
  stepRail: { alignItems: 'center', width: 26 },
  stepDot: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  stepLine: { width: 2, flex: 1, marginVertical: 2, borderRadius: 1 },
  stepText: { paddingBottom: spacing.md },
  stepWhen: { fontSize: typography.sm, fontWeight: typography.bold, marginTop: 4 },
  stepWhat: { fontSize: typography.sm, lineHeight: 18, marginTop: 1 },
  loading: { marginTop: spacing.md },
  note: { fontSize: typography.sm, textAlign: 'center', lineHeight: 20 },
  close: { position: 'absolute', left: spacing.base, width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center',
           borderWidth: StyleSheet.hairlineWidth },
  bar: { paddingHorizontal: spacing.base, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, gap: 6 },
  reassure: { textAlign: 'center', fontSize: typography.xs, fontWeight: typography.semibold },
  links: { flexDirection: 'row', justifyContent: 'center', gap: spacing.lg, marginTop: 2 },
  link: { fontSize: typography.xs, fontWeight: typography.semibold },
  legal: { textAlign: 'center', fontSize: 10, lineHeight: 13 },
});
