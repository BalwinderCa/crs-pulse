import { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as ExpoSplash from 'expo-splash-screen';
import { useProfileStore, DEFAULT_PROFILE } from '@/store/profileStore';
import { useDrawsStore } from '@/store/drawsStore';
import MainNavigator from './MainNavigator';
import FaqScreen from '@/features/faq/screens/FaqScreen';
import ReportIssueScreen from '@/features/support/screens/ReportIssueScreen';
import SinpCalculatorScreen from '@/features/sinp/screens/SinpCalculatorScreen';
import type { RootStackParamList } from '@/types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const BOOT_TIMEOUT_MS = 5_000;

export default function RootNavigator() {
  const { profile, load: loadProfile } = useProfileStore();
  const loadDraws = useDrawsStore((s) => s.load);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadDraws().catch(() => {});

    const timeout = setTimeout(() => {
      // Safety net: if AsyncStorage hung and profile is still null, seed defaults
      // so the app can render rather than freezing on the splash indefinitely.
      if (useProfileStore.getState().profile === null) {
        useProfileStore.setState({ profile: DEFAULT_PROFILE });
      }
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

  if (!ready || profile === null) {
    return null;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="Main" component={MainNavigator} />
        <Stack.Screen name="Faq" component={FaqScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="ReportIssue" component={ReportIssueScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="SinpCalculator" component={SinpCalculatorScreen} options={{ animation: 'slide_from_right' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
