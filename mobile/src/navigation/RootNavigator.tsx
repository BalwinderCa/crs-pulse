import { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as SplashScreen from 'expo-splash-screen';
import { useProfileStore } from '@/store/profileStore';
import { useDrawsStore } from '@/store/drawsStore';
import SplashScreenView from '@/features/auth/screens/SplashScreen';
import MainNavigator from './MainNavigator';
import type { RootStackParamList } from '@/types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { profile, load: loadProfile } = useProfileStore();
  const loadDraws = useDrawsStore((s) => s.load);

  // Init stores on mount
  useEffect(() => {
    Promise.all([loadProfile(), loadDraws()]).catch(() => {});
  }, [loadProfile, loadDraws]);

  // Fallback: hide splash after 5s if stores never resolve
  useEffect(() => {
    const t = setTimeout(() => SplashScreen.hideAsync().catch(() => {}), 5000);
    return () => clearTimeout(t);
  }, []);

  // Hide splash once profile resolves
  useEffect(() => {
    if (profile !== null) SplashScreen.hideAsync().catch(() => {});
  }, [profile]);

  if (profile === null) return <SplashScreenView />;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="Main" component={MainNavigator} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
