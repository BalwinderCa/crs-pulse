import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
      {isStack ? (
        /* Internal page: back chevron (left) · centered title (flex) · right slot */
        <>
          <TouchableOpacity
            onPress={onBackPress ?? (() => navigation.goBack())}
            hitSlop={16}
            style={[s.iconBtn, s.stackSide]}
            accessibilityRole="button"
            accessibilityLabel={t('common.goBackFrom', { title })}
          >
            <Ionicons name="chevron-back" size={26} color={c.textPrimary} />
          </TouchableOpacity>
          <Text style={[s.stackTitle, { color: c.textPrimary }]} numberOfLines={1}>
            {title}
          </Text>
          <View style={[s.stackSide, s.stackRight]}>{right}</View>
        </>
      ) : (
        /* Main tab page: menu + label (left) · brand lockup (center) · actions (right) */
        <>
          <View style={s.sideLeft}>
            <TouchableOpacity
              onPress={() => setMenuOpen(true)}
              hitSlop={12}
              style={s.iconBtn}
              accessibilityRole="button"
              accessibilityLabel={t('common.openMenu')}
            >
              <Ionicons name="menu" size={26} color={c.textPrimary} />
            </TouchableOpacity>
            <Text style={[s.titleText, { color: c.textMuted }]} numberOfLines={1}>
              {title}
            </Text>
          </View>

          <View style={s.brandCenter}>
            <Logo size={20} />
            {isPremium && (
              <View style={[s.proBadge, { backgroundColor: palette.warning }]}>
                <Text style={s.proText}>{t('proBadge')}</Text>
              </View>
            )}
          </View>

          <View style={s.sideRight}>
            {right}
            <TouchableOpacity
              onPress={() => navigation.navigate('Notifications')}
              hitSlop={12}
              style={s.iconBtn}
              accessibilityRole="button"
              accessibilityLabel={t('notifications.title')}
            >
              <Ionicons name="notifications-outline" size={23} color={c.textPrimary} />
              {hasUnseen && <View style={[s.badge, { backgroundColor: palette.danger }]} />}
            </TouchableOpacity>
          </View>
        </>
      )}
      <SideMenu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        onOpen={() => setMenuOpen(true)}
      />
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
  stackTitle:  { flex: 1, textAlign: 'center', fontSize: typography.lg, fontWeight: typography.bold, letterSpacing: -0.3 },
  stackSide:   { minWidth: 40, flexDirection: 'row', alignItems: 'center' },
  stackRight:  { justifyContent: 'flex-end' },
  brandCenter: { flexDirection: 'row', alignItems: 'center' },
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
