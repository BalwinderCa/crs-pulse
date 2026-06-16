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
import ChecklistHubScreen from '@/features/checklist/screens/ChecklistHubScreen';
import DocumentChecklistScreen from '@/features/checklist/screens/DocumentChecklistScreen';
import FswCalculatorScreen from '@/features/fsw/screens/FswCalculatorScreen';
import BcSirsCalculatorScreen from '@/features/bcpnp/screens/BcSirsCalculatorScreen';
import NotificationsScreen from '@/features/notifications/screens/NotificationsScreen';
import ProcessingTimesScreen from '@/features/tracker/screens/ProcessingTimesScreen';
import PaywallScreen from '@/features/paywall/screens/PaywallScreen';
import { usePremiumStore } from '@/store/premiumStore';
import { useNotificationsStore } from '@/features/notifications/store/notificationsStore';
import { useApplicationStore } from '@/store/applicationStore';
import { useProcessingTimesStore } from '@/store/processingTimesStore';
import { useEePoolStore } from '@/store/eePoolStore';
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
    useNotificationsStore.getState().load().catch(() => {});
    useProcessingTimesStore.getState().load().catch(() => {});
    useEePoolStore.getState().load().catch(() => {});
    usePremiumStore.getState().init().catch(() => {});

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
        <Stack.Screen name="DocumentChecklist" component={ChecklistHubScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="DocumentChecklistDetail" component={DocumentChecklistScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="FswCalculator" component={FswCalculatorScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="BcSirsCalculator" component={BcSirsCalculatorScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="ProcessingTimes" component={ProcessingTimesScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="Paywall" component={PaywallScreen} options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
