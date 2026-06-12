import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Platform, StyleSheet, View } from 'react-native';
import { typography, spacing, borderRadius } from '@/theme';
import { useColors } from '@/hooks/useColors';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useTabBarLayout, TAB_BAR_TOP_PADDING } from '@/hooks/useTabBarLayout';
import type { MainTabParamList } from '@/types';

import HomeScreen from '@/features/home/screens/HomeScreen';
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
  const { tabBarHeight, tabBarBottomPadding } = useTabBarLayout();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        sceneStyle: { backgroundColor: colors.surfacePrimary },
        tabBarHideOnKeyboard: true,
        tabBarStyle: [
          styles.tabBar,
          {
            // Match screen bg so no visible seam above the tabs
            backgroundColor: colors.surfacePrimary,
            borderTopWidth: 0,
            borderTopColor: 'transparent',
            height: tabBarHeight,
            paddingBottom: tabBarBottomPadding,
            ...Platform.select({
              android: { elevation: 0 },
              ios: {
                shadowOpacity: 0,
                shadowRadius: 0,
                shadowOffset: { width: 0, height: 0 },
              },
            }),
          },
        ],
        tabBarActiveTintColor: accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: styles.tabLabel,
        tabBarLabel: TAB_LABELS[route.name],
        tabBarIcon: ({ focused, color }) => {
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
      <Tab.Screen name="Dashboard" component={HomeScreen} />
      <Tab.Screen name="Timeline"  component={TimelineScreen} />
      <Tab.Screen name="Draws"     component={DrawsScreen} />
      <Tab.Screen name="Analytics" component={AnalyticsScreen} />
      <Tab.Screen name="Settings"  component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    paddingTop: TAB_BAR_TOP_PADDING,
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
