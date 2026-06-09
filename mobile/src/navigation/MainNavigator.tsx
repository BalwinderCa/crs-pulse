import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { palette, typography, spacing, borderRadius, shadows } from '@/theme';
import { useColors } from '@/hooks/useColors';
import { useAccentColor } from '@/hooks/useAccentColor';
import type { MainTabParamList } from '@/types';

import DashboardScreen from '@/features/dashboard/screens/DashboardScreen';
import TimelineScreen from '@/features/timeline/screens/TimelineScreen';
import DrawsScreen from '@/features/draws/screens/DrawsScreen';
import AnalyticsScreen from '@/features/analytics/screens/AnalyticsScreen';
import ProfileScreen from '@/features/profile/screens/ProfileScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

type TabIconName = keyof typeof Ionicons.glyphMap;

const TAB_ICONS: Record<keyof MainTabParamList, { active: TabIconName; inactive: TabIconName }> = {
  Dashboard: { active: 'grid',      inactive: 'grid-outline' },
  Timeline:  { active: 'time',      inactive: 'time-outline' },
  Draws:     { active: 'flash',     inactive: 'flash-outline' },
  Analytics: { active: 'pulse',     inactive: 'pulse-outline' },
  Settings:  { active: 'person',    inactive: 'person-outline' },
};

const TAB_LABELS: Record<keyof MainTabParamList, string> = {
  Dashboard: 'Home',
  Timeline:  'Timeline',
  Draws:     'Draws',
  Analytics: 'Trends',
  Settings:  'Profile',
};

export default function MainNavigator() {
  const colors = useColors();
  const accent = useAccentColor();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: [
          styles.tabBar,
          {
            backgroundColor: colors.surfaceSecondary,
            borderTopColor: colors.border,
          },
        ],
        tabBarActiveTintColor: accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: styles.tabLabel,
        tabBarLabel: TAB_LABELS[route.name],
        tabBarIcon: ({ focused, color, size }) => {
          const icons = TAB_ICONS[route.name];
          return (
            <View style={[styles.iconWrap, focused && { backgroundColor: accent + '20' }]}>
              <Ionicons
                name={focused ? icons.active : icons.inactive}
                size={focused ? 22 : 20}
                color={color}
              />
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Timeline"  component={TimelineScreen} />
      <Tab.Screen name="Draws"     component={DrawsScreen} />
      <Tab.Screen name="Analytics" component={AnalyticsScreen} />
      <Tab.Screen name="Settings"  component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    borderTopWidth: 1,
    height: 84,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  iconWrap: {
    width: 40,
    height: 30,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: typography.xs,
    fontWeight: typography.semibold,
    letterSpacing: 0.2,
  },
});
