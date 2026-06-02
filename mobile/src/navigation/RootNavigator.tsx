import { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as SplashScreen from 'expo-splash-screen';
import { useOnboardingStore } from '@/store/onboardingStore';
import { useProfileStore } from '@/store/profileStore';
import { useDrawsStore } from '@/store/drawsStore';
import SplashScreenView from '@/features/auth/screens/SplashScreen';
import MainNavigator from './MainNavigator';
import OnboardingScreen from '@/features/onboarding/screens/OnboardingScreen';
import type { RootStackParamList } from '@/types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { isComplete: onboardingComplete, load: loadOnboarding } = useOnboardingStore();
  const loadProfile = useProfileStore((s) => s.load);
  const loadDraws = useDrawsStore((s) => s.load);

  // Init all local stores on mount
  useEffect(() => {
    Promise.all([loadOnboarding(), loadProfile(), loadDraws()]).catch(() => {});
  }, [loadOnboarding, loadProfile, loadDraws]);

  // Fallback: force-hide splash after 5s if stores never resolve
  useEffect(() => {
    const t = setTimeout(() => {
      useOnboardingStore.setState({ isComplete: false });
    }, 5000);
    return () => clearTimeout(t);
  }, []);

  // Hide splash once onboarding flag is resolved
  useEffect(() => {
    if (onboardingComplete !== null) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [onboardingComplete]);

  if (onboardingComplete === null) {
    return <SplashScreenView />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        {!onboardingComplete ? (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : (
          <Stack.Screen name="Main" component={MainNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
