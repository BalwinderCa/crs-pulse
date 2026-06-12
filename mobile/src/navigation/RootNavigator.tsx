import { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as ExpoSplash from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/constants';
import { useProfileStore, DEFAULT_PROFILE } from '@/store/profileStore';
import { useDrawsStore } from '@/store/drawsStore';
import MainNavigator from './MainNavigator';
import FaqScreen from '@/features/faq/screens/FaqScreen';
import ReportIssueScreen from '@/features/support/screens/ReportIssueScreen';
import SinpCalculatorScreen from '@/features/sinp/screens/SinpCalculatorScreen';
import OnboardingScreen from '@/features/onboarding/screens/OnboardingScreen';
import CalculatorsScreen from '@/features/calculators/screens/CalculatorsScreen';
import ApplicationSetupScreen from '@/features/tracker/screens/ApplicationSetupScreen';
import DocumentChecklistScreen from '@/features/checklist/screens/DocumentChecklistScreen';
import { useApplicationStore } from '@/store/applicationStore';
import DashboardScreen from '@/features/dashboard/screens/DashboardScreen';
import type { RootStackParamList } from '@/types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const BOOT_TIMEOUT_MS = 5_000;

export default function RootNavigator() {
  const { profile, load: loadProfile } = useProfileStore();
  const loadDraws = useDrawsStore((s) => s.load);
  const [ready, setReady] = useState(false);
  const [onboardingSeen, setOnboardingSeen] = useState<boolean | null>(null);

  useEffect(() => {
    loadDraws().catch(() => {});
    useApplicationStore.getState().load().catch(() => {});

    AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_SEEN)
      .then((v) => setOnboardingSeen(v === 'true'))
      // On storage failure, skip onboarding rather than re-showing it forever
      .catch(() => setOnboardingSeen(true));

    const timeout = setTimeout(() => {
      // Safety net: if AsyncStorage hung and profile is still null, seed defaults
      // so the app can render rather than freezing on the splash indefinitely.
      if (useProfileStore.getState().profile === null) {
        useProfileStore.setState({ profile: DEFAULT_PROFILE });
      }
      setOnboardingSeen((v) => (v === null ? true : v));
      setReady(true);
    }, BOOT_TIMEOUT_MS);

    loadProfile()
      .catch(() => {})
      .finally(() => {
        clearTimeout(timeout);
        setReady(true);
      });

    return () => clearTimeout(timeout);
  }, [loadProfile, loadDraws]);

  // Hide splash as soon as ready — don't gate on profile, as loadProfile()
  // always sets a non-null value and the null guard below handles the brief gap.
  useEffect(() => {
    if (ready) {
      ExpoSplash.hideAsync().catch(() => {});
    }
  }, [ready]);

  if (!ready || profile === null || onboardingSeen === null) {
    return null;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={onboardingSeen ? 'Main' : 'Onboarding'}
        screenOptions={{ headerShown: false, animation: 'fade' }}
      >
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Main" component={MainNavigator} />
        <Stack.Screen name="Faq" component={FaqScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="ReportIssue" component={ReportIssueScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="SinpCalculator" component={SinpCalculatorScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="CrsCalculator" component={DashboardScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="Calculators" component={CalculatorsScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="ApplicationSetup" component={ApplicationSetupScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="DocumentChecklist" component={DocumentChecklistScreen} options={{ animation: 'slide_from_right' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
