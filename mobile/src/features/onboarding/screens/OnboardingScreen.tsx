import { useMemo, useRef, useState } from 'react';
import {
  FlatList, Image, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions,
  type NativeScrollEvent, type NativeSyntheticEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { useProfileStore } from '@/store/profileStore';
import type { AppLanguage } from '@/store/profileStore';
import { STORAGE_KEYS } from '@/constants';
import { palette, spacing, typography, borderRadius } from '@/theme';
import { useColors } from '@/hooks/useColors';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useDrawNotifications } from '@/hooks/useDrawNotifications';
import { Toggle } from '@/components/common/Toggle';
import type { RootStackParamList } from '@/types';

type Slide = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  body: string;
};

type WelcomeFeature = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  tint: string;
  labelKey: string;
};

const WELCOME_FEATURES: WelcomeFeature[] = [
  { icon: 'flash-outline',         tint: palette.blue,      labelKey: 'onboarding.welcomeFeat0' },
  { icon: 'calculator-outline',    tint: palette.success,   labelKey: 'onboarding.welcomeFeat1' },
  { icon: 'stats-chart-outline',   tint: palette.warning,   labelKey: 'onboarding.welcomeFeat2' },
];

export async function markOnboardingSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_SEEN, 'true');
  } catch {}
}

export default function OnboardingScreen() {
  const c = useColors();
  const accent = useAccentColor();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { t } = useTranslation();
  const save = useProfileStore((s) => s.save);
  const profile = useProfileStore((s) => s.profile);
  const { enabled: notifyEnabled, toggle: toggleNotify } = useDrawNotifications();
  const listRef = useRef<FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);

  const slides: Slide[] = useMemo(() => [
    { icon: 'earth-outline',       title: t('onboarding.slide0Title'), body: t('onboarding.slide0Body') },
    { icon: 'flash-outline',       title: t('onboarding.slide1Title'), body: t('onboarding.slide1Body') },
    { icon: 'lock-closed-outline', title: t('onboarding.slide3Title'), body: t('onboarding.slide3Body') },
  ], [t]);

  const isLast = index === slides.length - 1;

  const finish = () => {
    markOnboardingSeen();
    navigation.replace('Main');
  };

  const next = () => {
    if (isLast) {
      finish();
    } else {
      listRef.current?.scrollToIndex({ index: index + 1, animated: true });
    }
  };

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  const toggleLanguage = async () => {
    const next: AppLanguage = (profile?.language ?? 'en') === 'en' ? 'fr' : 'en';
    await i18n.changeLanguage(next);
    await save({ language: next });
  };

  return (
    <View style={[s.wrap, { backgroundColor: c.surfacePrimary }]}>
      {/* Top row: language toggle (left) + skip (right) */}
      <View style={[s.topRow, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity onPress={toggleLanguage} hitSlop={12} style={s.langBtn}>
          <Ionicons name="globe-outline" size={18} color={accent} />
          <Text style={[s.langText, { color: accent }]}>{t('onboarding.languageBtn')}</Text>
        </TouchableOpacity>

        {!isLast ? (
          <TouchableOpacity onPress={finish} hitSlop={12}>
            <Text style={[s.skip, { color: c.textMuted }]}>{t('onboarding.skip')}</Text>
          </TouchableOpacity>
        ) : (
          <View />
        )}
      </View>

      <FlatList
        ref={listRef}
        data={slides}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        renderItem={({ item, index: i }) =>
          i === 0 ? (
            <View style={[s.slide, s.welcomeSlide, { width }]}>
              <Image
                source={require('../../../../assets/logo.png')}
                style={s.welcomeLogo}
                resizeMode="contain"
              />
              <Text style={[s.welcomeTitle, { color: c.textPrimary }]}>{item.title}</Text>
              <Text style={[s.welcomeSub, { color: c.textSecondary }]}>{t('onboarding.welcomeSub')}</Text>

              <View style={[s.featCard, { backgroundColor: c.surfaceCard, borderColor: c.border }]}>
                {WELCOME_FEATURES.map((f, idx) => (
                  <View
                    key={f.labelKey}
                    style={[
                      s.featRow,
                      idx > 0 && { borderTopColor: c.border, borderTopWidth: StyleSheet.hairlineWidth },
                    ]}
                  >
                    <View style={[s.featIcon, { backgroundColor: f.tint + '1A' }]}>
                      <Ionicons name={f.icon} size={18} color={f.tint} />
                    </View>
                    <Text style={[s.featLabel, { color: c.textPrimary }]}>{t(f.labelKey)}</Text>
                    <Ionicons name="checkmark-circle" size={18} color={palette.success} />
                  </View>
                ))}
              </View>

              <Text style={[s.disclaimer, { color: c.textMuted }]}>{t('onboarding.disclaimer')}</Text>
            </View>
          ) : (
            <View style={[s.slide, s.welcomeSlide, { width }]}>
              <View style={[s.iconCircle, { backgroundColor: accent + '15', borderColor: accent + '30' }]}>
                <Ionicons name={item.icon} size={42} color={accent} />
              </View>
              <Text style={[s.welcomeTitle, { color: c.textPrimary }]}>{item.title}</Text>
              <Text style={[s.welcomeSub, { color: c.textSecondary }]}>{item.body}</Text>

              {i === 1 && (
                <View style={[s.notifCard, { backgroundColor: accent + '16', borderColor: accent + '66' }]}>
                  <View style={[s.notifIcon, { backgroundColor: accent + '18' }]}>
                    <Ionicons name="notifications-outline" size={20} color={accent} />
                  </View>
                  <View style={s.notifText}>
                    <Text style={[s.notifTitle, { color: c.textPrimary }]}>{t('onboarding.notifyTitle')}</Text>
                    <Text style={[s.notifSub, { color: c.textSecondary }]}>{t('onboarding.notifySub')}</Text>
                  </View>
                  <Toggle
                    value={notifyEnabled}
                    onValueChange={toggleNotify}
                    activeColor={accent}
                    accessibilityLabel={t('onboarding.notifyTitle')}
                  />
                </View>
              )}
            </View>
          )
        }
      />

      {/* Dots + CTA */}
      <View style={[s.footer, { paddingBottom: insets.bottom + spacing.xl }]}>
        <View style={s.dots}>
          {slides.map((_, i) => (
            <View
              key={i}
              style={[
                s.dot,
                { backgroundColor: i === index ? accent : c.surfaceTertiary },
                i === index && s.dotActive,
              ]}
            />
          ))}
        </View>
        <TouchableOpacity
          style={[s.cta, { backgroundColor: accent }]}
          onPress={next}
          activeOpacity={0.8}
        >
          <Text style={s.ctaText}>{isLast ? t('onboarding.getStarted') : t('onboarding.next')}</Text>
          <Ionicons name={isLast ? 'checkmark' : 'arrow-forward'} size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap:   { flex: 1 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
            paddingHorizontal: spacing.base, minHeight: 44 },
  langBtn:  { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, padding: spacing.xs },
  langText: { fontSize: typography.sm, fontWeight: typography.semibold },
  skip:   { fontSize: typography.base, fontWeight: typography.semibold, padding: spacing.xs },

  slide: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: spacing['2xl'], gap: spacing.base,
  },
  iconCircle: {
    width: 96, height: 96, borderRadius: 48, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs,
  },
  /* Welcome slide (paywall-style) */
  welcomeSlide: { justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg },
  welcomeLogo: { width: 96, height: 96, marginBottom: spacing.xs },
  welcomeTitle: {
    fontSize: typography['2xl'], fontWeight: typography.black,
    letterSpacing: -0.5, textAlign: 'center',
  },
  welcomeSub: {
    fontSize: typography.base, lineHeight: 22, textAlign: 'center',
    paddingHorizontal: spacing.sm, marginBottom: spacing.xs,
  },
  featCard: {
    alignSelf: 'stretch', borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden',
  },
  featRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2,
    paddingHorizontal: spacing.md, paddingVertical: spacing.base,
  },
  featIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  featLabel: { flex: 1, fontSize: typography.sm, fontWeight: typography.semibold },
  disclaimer: {
    fontSize: typography.xs, lineHeight: 16, textAlign: 'center',
    paddingHorizontal: spacing.sm, marginTop: spacing.sm,
  },

  notifCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    alignSelf: 'stretch', marginTop: spacing.lg,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md, borderWidth: 1,
  },
  notifIcon: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  notifText:  { flex: 1, gap: 2 },
  notifTitle: { fontSize: typography.sm, fontWeight: typography.bold, textAlign: 'left' },
  notifSub:   { fontSize: typography.xs, lineHeight: 16, textAlign: 'left' },

  footer: { paddingHorizontal: spacing.xl, gap: spacing.lg, alignItems: 'center' },
  dots:   { flexDirection: 'row', gap: spacing.xs },
  dot:    { width: 8, height: 8, borderRadius: 4 },
  dotActive: { width: 22 },

  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, alignSelf: 'stretch',
    paddingVertical: spacing.md, borderRadius: borderRadius.md,
  },
  ctaText: { color: '#fff', fontSize: typography.base, fontWeight: typography.bold },
});
