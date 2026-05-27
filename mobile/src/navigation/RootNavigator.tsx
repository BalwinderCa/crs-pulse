import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as SplashScreen from 'expo-splash-screen';
import { useAuthStore } from '@/store/authStore';
import SplashScreenView from '@/features/auth/screens/SplashScreen';
import type { RootStackParamList } from '@/types';

// Eagerly import navigators — React.lazy inside Stack.Screen causes
// react-native-screens Freeze to hold the screen black.
import AuthNavigator from './AuthNavigator';
// MainNavigator is only shown post-login; lazy is fine there (not frozen).
const MainNavigator = React.lazy(() => import('./MainNavigator'));

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { isAuthenticated, isInitialized, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Hide native splash once auth state is resolved
  useEffect(() => {
    if (isInitialized) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isInitialized]);

  if (!isInitialized) {
    return <SplashScreenView />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        {isAuthenticated ? (
          <Stack.Screen name="Main" component={MainNavigator as React.ComponentType} />
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
