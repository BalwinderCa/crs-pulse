import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Logo } from '@/components/common/Logo';
import { SideMenu } from '@/features/dashboard/components/SideMenu';
import { useNotificationsStore } from '@/features/notifications/store/notificationsStore';
import { useDrawsStore } from '@/store/drawsStore';
import { usePremiumStore } from '@/store/premiumStore';
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
  const isPremium = usePremiumStore((s) => s.isPremium);
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
      {/* Left — nav button + screen name */}
      <View style={s.sideLeft}>
        {isStack ? (
          // Chevron + screen name are one tappable back target
          <TouchableOpacity
            onPress={onBackPress ?? (() => navigation.goBack())}
            hitSlop={12}
            style={s.backRow}
            accessibilityRole="button"
            accessibilityLabel={`Go back from ${title}`}
          >
            <Ionicons name="chevron-back" size={24} color={c.textPrimary} />
            <Text style={[s.stackTitle, { color: c.textPrimary }]} numberOfLines={1}>
              {title}
            </Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity
              onPress={() => setMenuOpen(true)}
              hitSlop={12}
              style={s.iconBtn}
              accessibilityRole="button"
              accessibilityLabel="Open menu"
            >
              <Ionicons name="menu" size={26} color={c.textPrimary} />
            </TouchableOpacity>
            <Text style={[s.titleText, { color: c.textMuted }]} numberOfLines={1}>
              {title}
            </Text>
          </>
        )}
      </View>

      {/* Center — brand lockup (main tab pages only, not internal/stack pages) */}
      {!isStack && (
        <View style={s.brandCenter}>
          <Image source={require('../../../assets/logo.png')} style={s.brandIcon} resizeMode="contain" />
          <Logo size={20} />
          {isPremium && (
            <View style={[s.proBadge, { backgroundColor: palette.warning }]}>
              <Text style={s.proText}>👑 PRO</Text>
            </View>
          )}
        </View>
      )}

      {/* Right — actions */}
      <View style={s.sideRight}>
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
    paddingTop: spacing.base,
    paddingBottom: spacing.md,
  },
  sideLeft:    { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minWidth: 0 },
  backRow:     { flexDirection: 'row', alignItems: 'center', gap: 2, flexShrink: 1, paddingVertical: 4, paddingRight: spacing.sm },
  stackTitle:  { flexShrink: 1, fontSize: typography.lg, fontWeight: typography.bold, letterSpacing: -0.3 },
  brandCenter: { flexDirection: 'row', alignItems: 'center' },
  brandIcon:   { width: 38, height: 38, marginRight: -7 },
  proBadge: {
    alignSelf: 'flex-start',
    marginTop: -4, marginLeft: 3,
    paddingHorizontal: 5, paddingVertical: 1,
    borderRadius: 6,
  },
  proText: { fontSize: 9, fontWeight: typography.black, letterSpacing: 0.3, color: palette.navyDark },
  sideRight:   { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: spacing.md },
  iconBtn:     { padding: 2 },
  badge: {
    position: 'absolute', top: 1, right: 1,
    width: 9, height: 9, borderRadius: 5,
  },
  titleText: {
    flexShrink: 1,
    fontSize: typography.xs, fontWeight: typography.semibold,
    letterSpacing: 0.6, textTransform: 'uppercase',
  },
});
