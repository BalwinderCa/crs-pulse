import React, { Suspense, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { StyleSheet, View, ActivityIndicator, LogBox } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

// Suppress harmless native animated bridge warnings in dev mode
LogBox.ignoreLogs([
  'onAnimatedValueUpdate',
  'Sending `onAnimatedValueUpdate`',
]);
import RootNavigator from '@/navigation/RootNavigator';
import { palette } from '@/theme';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { registerFCMToken, setupFCMListeners } from '@/services/fcmService';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';
import { API_CACHE_KEYS } from '@/constants';

// Prevent the native splash from auto-hiding.
// RootNavigator calls SplashScreen.hideAsync() once auth is resolved.
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
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { setUnreadCount } = useNotificationStore();
  useNetworkStatus();

  useEffect(() => {
    if (!isAuthenticated) return;

    registerFCMToken();

    const unsubscribe = setupFCMListeners((data) => {
      queryClient.invalidateQueries({ queryKey: [API_CACHE_KEYS.NOTIFICATIONS] });
      queryClient.invalidateQueries({ queryKey: [API_CACHE_KEYS.DASHBOARD] });
      if (data['type'] === 'new_draw') {
        queryClient.invalidateQueries({ queryKey: [API_CACHE_KEYS.DRAWS] });
      }
    });

    return () => unsubscribe();
  }, [isAuthenticated, setUnreadCount]);

  return <RootNavigator />;
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ErrorBoundary>
            {/* Suspense handles MainNavigator (lazy, only for authenticated users) */}
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
