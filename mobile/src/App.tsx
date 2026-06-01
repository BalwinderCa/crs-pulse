import React, { Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { StyleSheet, View, ActivityIndicator, LogBox } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

// Suppress harmless dev-mode warnings that clutter the UI
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
// Silence ALL yellow box warnings in development
if (__DEV__) LogBox.ignoreAllLogs();
import RootNavigator from '@/navigation/RootNavigator';
import { palette } from '@/theme';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

// Prevent the native splash from auto-hiding.
// RootNavigator calls SplashScreen.hideAsync() once stores are ready.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
      staleTime: 2 * 60 * 1000,
    },
    mutations: {
      retry: 0,
    },
  },
});

function LoadingFallback() {
  return (
    <View style={styles.loader}>
      <ActivityIndicator size="large" color={palette.blue} />
    </View>
  );
}

function AppInner() {
  useNetworkStatus();
  return <RootNavigator />;
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
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
  root: {
    flex: 1,
    backgroundColor: palette.surfacePrimary,
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surfacePrimary,
  },
});
