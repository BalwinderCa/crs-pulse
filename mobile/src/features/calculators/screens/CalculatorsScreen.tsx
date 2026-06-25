import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { spacing, typography, borderRadius } from '@/theme';
import { useColors } from '@/hooks/useColors';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { useAccentColor } from '@/hooks/useAccentColor';
import type { RootStackParamList } from '@/types';
import { AppHeader } from '@/components/layout/AppHeader';

export default function CalculatorsScreen() {
  const c = useColors();
  const accent = useAccentColor();
  const insets = useSafeAreaInsets();
  const { contentFrameStyle } = useResponsiveLayout();
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const calcEntries: { icon: React.ComponentProps<typeof Ionicons>['name']; title: string; desc: string; meta: string; route: 'CrsCalculator' | 'SinpCalculator' | 'FswCalculator' | 'BcSirsCalculator' }[] = [
    { icon: 'speedometer-outline', title: t('calculators.crsTitle'), desc: t('calculators.crsDesc'), meta: '1,200', route: 'CrsCalculator' },
    { icon: 'calculator-outline', title: t('calculators.sinpTitle'), desc: t('calculators.sinpDesc'), meta: '110 · 60', route: 'SinpCalculator' },
    { icon: 'checkmark-done-outline', title: t('calculators.fswTitle'), desc: t('calculators.fswDesc'), meta: '100 · 67', route: 'FswCalculator' },
    { icon: 'trail-sign-outline', title: t('calculators.bcpnpTitle'), desc: t('calculators.bcpnpDesc'), meta: '200', route: 'BcSirsCalculator' },
  ];

  return (
    <View style={[s.wrap, { backgroundColor: c.surfacePrimary }]}>
      <AppHeader title={t('calculators.title')} variant="stack" />

      <ScrollView
        contentContainerStyle={[s.body, contentFrameStyle, { paddingBottom: insets.bottom + spacing['2xl'] }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[s.intro, { color: c.textSecondary }]}>
          {t('calculators.intro')}
        </Text>

        {calcEntries.map((calc) => (
          <TouchableOpacity
            key={calc.title}
            style={[s.card, { borderColor: c.border, backgroundColor: c.surfaceCard }]}
            onPress={() => navigation.navigate(calc.route)}
            activeOpacity={0.65}
          >
            <View style={[s.iconBox, { backgroundColor: accent + '18' }]}>
              <Ionicons name={calc.icon} size={22} color={accent} />
            </View>
            <View style={s.cardText}>
              <Text style={[s.cardTitle, { color: c.textPrimary }]}>{calc.title}</Text>
              <Text style={[s.cardDesc, { color: c.textSecondary }]}>{calc.desc}</Text>
              <Text style={[s.cardMeta, { color: accent }]}>{calc.meta}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  wrap:      { flex: 1 },
  topBar:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
               paddingHorizontal: spacing.base, paddingBottom: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn:   { flexDirection: 'row', alignItems: 'center', gap: 2, width: 60 },
  backLabel: { fontSize: typography.base, fontWeight: typography.medium },
  title:     { fontSize: typography.base, fontWeight: typography.semibold, flex: 1, textAlign: 'center' },
  body:      { padding: spacing.base, paddingTop: spacing.lg, gap: spacing.sm },
  intro:     { fontSize: typography.sm, lineHeight: 20, marginBottom: spacing.xs },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    borderWidth: StyleSheet.hairlineWidth, borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  cardDisabled: { opacity: 0.75 },
  iconBox: {
    width: 44, height: 44, borderRadius: borderRadius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  cardText:  { flex: 1, gap: 2 },
  cardTitle: { fontSize: typography.base, fontWeight: typography.bold },
  cardDesc:  { fontSize: typography.sm, lineHeight: 18 },
  cardMeta:  { fontSize: typography.xs, fontWeight: typography.semibold, marginTop: 2 },
});
