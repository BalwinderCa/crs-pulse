import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useColors } from '@/hooks/useColors';
import { useAccentColor } from '@/hooks/useAccentColor';
import { usePremiumStore } from '@/store/premiumStore';
import { spacing, typography, borderRadius } from '@/theme';
import type { RootStackParamList } from '@/types';

export function UpgradeBanner() {
  const c = useColors();
  const accent = useAccentColor();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const isPremium = usePremiumStore((s) => s.isPremium);
  const premiumLoaded = usePremiumStore((s) => s.loaded);

  if (!premiumLoaded || isPremium) return null;

  return (
    <TouchableOpacity
      style={[s.banner, { backgroundColor: accent + '12', borderColor: accent + '40' }]}
      onPress={() => nav.navigate('Paywall')}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel="Upgrade to Premium"
    >
      <View style={[s.iconBox, { backgroundColor: accent + '22' }]}>
        <Ionicons name="star" size={14} color={accent} />
      </View>
      <View style={s.text}>
        <Text style={[s.title, { color: c.textPrimary }]}>Upgrade to Premium</Text>
        <Text style={[s.sub, { color: c.textSecondary }]}>
          Analytics · Ad-free experience
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={accent} />
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1 },
  title: { fontSize: typography.sm, fontWeight: typography.bold },
  sub: { fontSize: typography.xs, lineHeight: 16 },
});
