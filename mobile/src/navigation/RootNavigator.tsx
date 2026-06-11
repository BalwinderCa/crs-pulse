import { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as ExpoSplash from 'expo-splash-screen';
import { useProfileStore } from '@/store/profileStore';
import { useDrawsStore } from '@/store/drawsStore';
import MainNavigator from './MainNavigator';
import type { RootStackParamList } from '@/types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const BOOT_TIMEOUT_MS = 8_000;

export default function RootNavigator() {
  const { profile, load: loadProfile } = useProfileStore();
  const loadDraws = useDrawsStore((s) => s.load);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadDraws().catch(() => {});

    const timeout = setTimeout(() => setReady(true), BOOT_TIMEOUT_MS);

    loadProfile()
      .catch(() => {})
      .finally(() => {
        clearTimeout(timeout);
        setReady(true);
      });

    return () => clearTimeout(timeout);
  }, [loadProfile, loadDraws]);

  useEffect(() => {
    if (ready && profile !== null) {
      ExpoSplash.hideAsync().catch(() => {});
    }
  }, [ready, profile]);

  if (!ready || profile === null) {
    return null;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="Main" component={MainNavigator} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
