import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet } from 'react-native';
import { palette, typography, spacing } from '@/theme';
import type { MainTabParamList } from '@/types';

// Eagerly import all tab screens — React.lazy inside Tab.Screen causes
// react-native-screens Freeze/Suspender to hold screens black (invisible).
import DashboardScreen from '@/features/dashboard/screens/DashboardScreen';
import DrawsScreen from '@/features/draws/screens/DrawsScreen';
import AnalyticsScreen from '@/features/analytics/screens/AnalyticsScreen';
import ProfileScreen from '@/features/profile/screens/ProfileScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

type TabIconName = keyof typeof Ionicons.glyphMap;

const TAB_ICONS: Record<keyof MainTabParamList, { active: TabIconName; inactive: TabIconName }> = {
  Dashboard: { active: 'home', inactive: 'home-outline' },
  Draws: { active: 'list', inactive: 'list-outline' },
  Analytics: { active: 'bar-chart', inactive: 'bar-chart-outline' },
  Settings: { active: 'settings', inactive: 'settings-outline' },
};

export default function MainNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: palette.blue,
        tabBarInactiveTintColor: palette.gray400,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ focused, color, size }) => {
          const icons = TAB_ICONS[route.name];
          const iconName = focused ? icons.active : icons.inactive;
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Draws" component={DrawsScreen} />
      <Tab.Screen name="Analytics" component={AnalyticsScreen} />
      <Tab.Screen name="Settings" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: palette.surfaceSecondary,
    borderTopColor: palette.surfaceTertiary,
    borderTopWidth: 1,
    height: 80,
    paddingBottom: spacing.base,
    paddingTop: spacing.sm,
  },
  tabLabel: {
    fontSize: typography.xs,
    fontWeight: typography.medium,
  },
});
