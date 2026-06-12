import { useRef, useState } from 'react';
import {
  FlatList, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions,
  type NativeScrollEvent, type NativeSyntheticEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

const SLIDES: Slide[] = [
  {
    icon: 'earth-outline',
    title: 'Welcome to CRS Pulse',
    body: 'Your free Express Entry companion. Track draws, know your score, and plan your path to Canadian permanent residency.',
  },
  {
    icon: 'flash-outline',
    title: 'Live Draw Tracking',
    body: 'Official IRCC draw results the moment they are published — with push alerts so you never miss a round of invitations.',
  },
  {
    icon: 'calculator-outline',
    title: 'Know Your Score',
    body: 'The full IRCC CRS grid runs on your device. See your score breakdown, which draw categories fit you, and tools like the SINP calculator.',
  },
  {
    icon: 'lock-closed-outline',
    title: 'Private by Design',
    body: 'Everything stays on your phone. No accounts, no trackers, no ads — completely free, built for aspiring Canadians.',
  },
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
  const listRef = useRef<FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);

  const isLast = index === SLIDES.length - 1;

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

  return (
    <View style={[s.wrap, { backgroundColor: c.surfacePrimary }]}>
      {/* Skip */}
      <View style={[s.topRow, { paddingTop: insets.top + spacing.sm }]}>
        {!isLast ? (
          <TouchableOpacity onPress={finish} hitSlop={12}>
            <Text style={[s.skip, { color: c.textMuted }]}>Skip</Text>
          </TouchableOpacity>
        ) : (
          <View />
        )}
      </View>

      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(item) => item.title}
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
          {SLIDES.map((slide, i) => (
            <View
              key={slide.title}
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
          <Text style={s.ctaText}>{isLast ? 'Get Started' : 'Next'}</Text>
          <Ionicons name={isLast ? 'checkmark' : 'arrow-forward'} size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap:   { flex: 1 },
  topRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: spacing.base, minHeight: 44 },
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
