import React, { Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { StyleSheet, View, ActivityIndicator, LogBox } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { palette } from '@/theme';
import { useColors } from '@/hooks/useColors';

LogBox.ignoreLogs([
  'onAnimatedValueUpdate',
  'Sending `onAnimatedValueUpdate`',
  'VirtualizedLists should never be nested',
  'Each child in a list should have a unique',
  'Warning: An update to',
  'Non-serializable values were found in the navigation state',
  'Require cycle:',
  'new NativeEventEmitter',
  'EventEmitter.removeListener',
  '[expo-notifications]',
  'No native splash screen',
]);
if (__DEV__) LogBox.ignoreAllLogs();

import RootNavigator from '@/navigation/RootNavigator';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries:   { retry: 2, refetchOnWindowFocus: false, staleTime: 2 * 60 * 1000 },
    mutations: { retry: 0 },
  },
});

function LoadingFallback() {
  const colors = useColors();
  return (
    <View style={[styles.loader, { backgroundColor: colors.surfacePrimary }]}>
      <ActivityIndicator size="large" color={palette.blue} />
    </View>
  );
}

function AppInner() {
  useNetworkStatus();
  return <RootNavigator />;
}

export default function App() {
  const colors = useColors();
  return (
    <GestureHandlerRootView style={[styles.root, { backgroundColor: colors.surfacePrimary }]}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ErrorBoundary>
            <Suspense fallback={<LoadingFallback />}>
              <AppInner />
            </Suspense>
          </ErrorBoundary>
          <Toast />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1 },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
