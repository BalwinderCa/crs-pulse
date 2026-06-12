import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, typography, borderRadius } from '@/theme';
import { useColors } from '@/hooks/useColors';
import { useAccentColor } from '@/hooks/useAccentColor';
import type { RootStackParamList } from '@/types';

type CalcEntry = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  desc: string;
  meta: string;
  route?: keyof RootStackParamList;
};

const CALCULATORS: CalcEntry[] = [
  {
    icon: 'speedometer-outline',
    title: 'Express Entry — CRS',
    desc: 'Comprehensive Ranking System score for the federal Express Entry pool.',
    meta: 'Out of 1,200',
    route: 'CrsCalculator',
  },
  {
    icon: 'calculator-outline',
    title: 'Saskatchewan — SINP',
    desc: 'International Skilled Worker points for the Saskatchewan EOI pool.',
    meta: 'Out of 110 · pass 60',
    route: 'SinpCalculator',
  },
  {
    icon: 'checkmark-done-outline',
    title: 'FSW Eligibility — 67 points',
    desc: 'Federal Skilled Worker six-factor eligibility check.',
    meta: 'Coming soon',
  },
  {
    icon: 'trail-sign-outline',
    title: 'British Columbia — SIRS',
    desc: 'BC PNP Skills Immigration registration score.',
    meta: 'Coming soon',
  },
];

export default function CalculatorsScreen() {
  const c = useColors();
  const accent = useAccentColor();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <View style={[s.wrap, { backgroundColor: c.surfacePrimary }]}>
      <View style={[s.topBar, { paddingTop: insets.top + spacing.sm, borderBottomColor: c.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={16} style={s.backBtn}>
          <Ionicons name="chevron-back" size={22} color={c.textPrimary} />
          <Text style={[s.backLabel, { color: c.textPrimary }]}>Back</Text>
        </TouchableOpacity>
        <Text style={[s.title, { color: c.textPrimary }]}>Calculators</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        contentContainerStyle={[s.body, { paddingBottom: insets.bottom + spacing['2xl'] }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[s.intro, { color: c.textSecondary }]}>
          Points calculators for Canadian immigration programs. All run fully on your device.
        </Text>

        {CALCULATORS.map((calc) => {
          const enabled = !!calc.route;
          return (
            <TouchableOpacity
              key={calc.title}
              style={[
                s.card,
                { borderColor: c.border, backgroundColor: c.surfaceCard },
                !enabled && s.cardDisabled,
              ]}
              onPress={enabled ? () => navigation.navigate(calc.route!) : undefined}
              activeOpacity={enabled ? 0.65 : 1}
              disabled={!enabled}
            >
              <View style={[s.iconBox, { backgroundColor: accent + (enabled ? '18' : '0D') }]}>
                <Ionicons name={calc.icon} size={22} color={enabled ? accent : c.textMuted} />
              </View>
              <View style={s.cardText}>
                <Text style={[s.cardTitle, { color: enabled ? c.textPrimary : c.textMuted }]}>
                  {calc.title}
                </Text>
                <Text style={[s.cardDesc, { color: enabled ? c.textSecondary : c.textMuted }]}>
                  {calc.desc}
                </Text>
                <Text style={[s.cardMeta, { color: enabled ? accent : c.textMuted }]}>{calc.meta}</Text>
              </View>
              {enabled && <Ionicons name="chevron-forward" size={16} color={c.textMuted} />}
            </TouchableOpacity>
          );
        })}
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
