import { useMemo, useRef, useState } from 'react';
import {
  FlatList, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions,
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
import { spacing, typography, borderRadius } from '@/theme';
import { useColors } from '@/hooks/useColors';
import { useAccentColor } from '@/hooks/useAccentColor';
import type { RootStackParamList } from '@/types';

type Slide = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  body: string;
};

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
  const listRef = useRef<FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);

  const slides: Slide[] = useMemo(() => [
    { icon: 'earth-outline',       title: t('onboarding.slide0Title'), body: t('onboarding.slide0Body') },
    { icon: 'flash-outline',       title: t('onboarding.slide1Title'), body: t('onboarding.slide1Body') },
    { icon: 'calculator-outline',  title: t('onboarding.slide2Title'), body: t('onboarding.slide2Body') },
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
        renderItem={({ item }) => (
          <View style={[s.slide, { width }]}>
            <View style={[s.iconCircle, { backgroundColor: accent + '15', borderColor: accent + '30' }]}>
              <Ionicons name={item.icon} size={56} color={accent} />
            </View>
            <Text style={[s.title, { color: c.textPrimary }]}>{item.title}</Text>
            <Text style={[s.body, { color: c.textSecondary }]}>{item.body}</Text>
          </View>
        )}
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
    width: 128, height: 128, borderRadius: 64, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md,
  },
  title: {
    fontSize: typography['3xl'], fontWeight: typography.black,
    letterSpacing: -0.5, textAlign: 'center',
  },
  body: {
    fontSize: typography.base, lineHeight: 24, textAlign: 'center',
  },

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
