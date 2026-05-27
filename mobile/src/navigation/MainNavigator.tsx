import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet } from 'react-native';
import { useNotificationStore } from '@/store/notificationStore';
import { palette, typography, spacing } from '@/theme';
import type { MainTabParamList } from '@/types';

const DashboardScreen = React.lazy(
  () => import('@/features/dashboard/screens/DashboardScreen'),
);
const DrawsScreen = React.lazy(() => import('@/features/draws/screens/DrawsScreen'));
const AnalyticsScreen = React.lazy(
  () => import('@/features/analytics/screens/AnalyticsScreen'),
);
const NotificationsScreen = React.lazy(
  () => import('@/features/notifications/screens/NotificationsScreen'),
);
const ProfileScreen = React.lazy(
  () => import('@/features/profile/screens/ProfileScreen'),
);

const Tab = createBottomTabNavigator<MainTabParamList>();

type TabIconName = keyof typeof Ionicons.glyphMap;

const TAB_ICONS: Record<keyof MainTabParamList, { active: TabIconName; inactive: TabIconName }> = {
  Dashboard: { active: 'home', inactive: 'home-outline' },
  Draws: { active: 'list', inactive: 'list-outline' },
  Analytics: { active: 'bar-chart', inactive: 'bar-chart-outline' },
  Notifications: { active: 'notifications', inactive: 'notifications-outline' },
  Profile: { active: 'person', inactive: 'person-outline' },
};

function NotificationBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
    </View>
  );
}

export default function MainNavigator() {
  const unreadCount = useNotificationStore((s) => s.unreadCount);

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
          return (
            <View>
              <Ionicons name={iconName} size={size} color={color} />
              {route.name === 'Notifications' && (
                <NotificationBadge count={unreadCount} />
              )}
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen as React.ComponentType} />
      <Tab.Screen name="Draws" component={DrawsScreen as React.ComponentType} />
      <Tab.Screen name="Analytics" component={AnalyticsScreen as React.ComponentType} />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen as React.ComponentType}
      />
      <Tab.Screen name="Profile" component={ProfileScreen as React.ComponentType} />
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
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: palette.danger,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: palette.white,
    fontSize: 10,
    fontWeight: typography.bold,
  },
});
