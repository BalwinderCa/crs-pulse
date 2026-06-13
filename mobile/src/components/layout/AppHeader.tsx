import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Logo } from '@/components/common/Logo';
import { SideMenu } from '@/features/dashboard/components/SideMenu';
import { useNotificationsStore } from '@/features/notifications/store/notificationsStore';
import { useDrawsStore } from '@/store/drawsStore';
import { spacing, typography } from '@/theme';
import { useColors } from '@/hooks/useColors';
import { palette } from '@/theme';
import type { RootStackParamList } from '@/types';

type Props = {
  /** Page name shown under the wordmark, e.g. "Home". */
  title: string;
  /**
   * 'tab'   — used inside a SafeAreaView: shows the side-menu hamburger
   * 'stack' — pushed screen: adds top inset, bottom border and a back button
   */
  variant?: 'tab' | 'stack';
  /** Override the stack back action (e.g. wizard step-back). */
  onBackPress?: () => void;
  right?: React.ReactNode;
};

export function AppHeader({ title, variant = 'tab', onBackPress, right }: Props) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [menuOpen, setMenuOpen] = useState(false);
  const isStack = variant === 'stack';

  const latestDraw = useDrawsStore((s) => s.draws[0]);
  const { seenDraw, loaded, markSeen } = useNotificationsStore();

  // First run: initialize quietly so a fresh install doesn't start with a badge
  useEffect(() => {
    if (loaded && seenDraw === null && latestDraw) {
      markSeen(latestDraw.draw_number);
    }
  }, [loaded, seenDraw, latestDraw, markSeen]);

  const hasUnseen =
    loaded && seenDraw !== null && !!latestDraw && latestDraw.draw_number > seenDraw;

  return (
    <View
      style={[
        s.container,
        isStack && {
          paddingTop: insets.top + spacing.sm,
          paddingHorizontal: spacing.base,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: c.border,
        },
      ]}
    >
      <View style={s.left}>
        {isStack && (
          <TouchableOpacity
            onPress={onBackPress ?? (() => navigation.goBack())}
            hitSlop={16}
            style={s.iconBtn}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={24} color={c.textPrimary} />
          </TouchableOpacity>
        )}
        {!isStack && (
          <TouchableOpacity
            onPress={() => setMenuOpen(true)}
            hitSlop={12}
            style={s.iconBtn}
            accessibilityRole="button"
            accessibilityLabel="Open menu"
          >
            <Ionicons name="menu" size={26} color={c.textPrimary} />
          </TouchableOpacity>
        )}
        <View>
          <Logo size={20} />
          <Text style={[s.titleText, { color: c.textMuted }]} numberOfLines={1}>
            {title}
          </Text>
        </View>
      </View>
      <View style={s.rightWrap}>
        {right}
        {!isStack && (
          <TouchableOpacity
            onPress={() => navigation.navigate('Notifications')}
            hitSlop={12}
            style={s.iconBtn}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <Ionicons name="notifications-outline" size={23} color={c.textPrimary} />
            {hasUnseen && <View style={[s.badge, { backgroundColor: palette.danger }]} />}
          </TouchableOpacity>
        )}
      </View>
      <SideMenu visible={menuOpen} onClose={() => setMenuOpen(false)} />
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingTop: spacing.base,
    paddingBottom: spacing.md,
  },
  left:      { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 1 },
  rightWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconBtn:   { padding: 2 },
  badge: {
    position: 'absolute', top: 1, right: 1,
    width: 9, height: 9, borderRadius: 5,
  },
  titleText: {
    fontSize: typography.xs, fontWeight: typography.semibold,
    letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 1,
  },
});
