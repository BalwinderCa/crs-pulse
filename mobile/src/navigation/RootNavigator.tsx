import { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as SplashScreen from 'expo-splash-screen';
import { useProfileStore } from '@/store/profileStore';
import { useDrawsStore } from '@/store/drawsStore';
import { useAuthStore } from '@/store/authStore';
import SplashScreenView from '@/features/auth/screens/SplashScreen';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import type { RootStackParamList } from '@/types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { profile, load: loadProfile } = useProfileStore();
  const loadDraws = useDrawsStore((s) => s.load);
  const { isAuthenticated, isInitialized, initialize } = useAuthStore();

  // Init all stores on mount
  useEffect(() => {
    Promise.all([initialize(), loadProfile(), loadDraws()]).catch(() => {});
  }, [initialize, loadProfile, loadDraws]);

  // Fallback: hide splash after 5s if stores never resolve
  useEffect(() => {
    const t = setTimeout(() => SplashScreen.hideAsync().catch(() => {}), 5000);
    return () => clearTimeout(t);
  }, []);

  // Hide splash once auth is resolved and local profile is loaded
  useEffect(() => {
    if (isInitialized && profile !== null) SplashScreen.hideAsync().catch(() => {});
  }, [isInitialized, profile]);

  if (!isInitialized || profile === null) return <SplashScreenView />;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        {isAuthenticated ? (
          <Stack.Screen name="Main" component={MainNavigator} />
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
