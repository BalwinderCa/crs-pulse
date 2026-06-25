import '@/i18n'; // initialise i18next with bundled translations
import React, { Suspense, useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { StyleSheet, View, ActivityIndicator, LogBox, Text, TextInput } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { palette } from '@/theme';
import { useColors } from '@/hooks/useColors';

// Honour Dynamic Type (allowFontScaling stays on) but cap the multiplier so the
// largest accessibility text sizes can't shatter fixed layouts (tab bar, score
// gauge, cards). Components that need a tighter cap set their own — a lower
// per-component maxFontSizeMultiplier still wins over this default.
type ScalableDefaults = { defaultProps?: { maxFontSizeMultiplier?: number } };
const FONT_SCALE_CAP = 1.6;
(Text as unknown as ScalableDefaults).defaultProps = {
  ...(Text as unknown as ScalableDefaults).defaultProps,
  maxFontSizeMultiplier: FONT_SCALE_CAP,
};
(TextInput as unknown as ScalableDefaults).defaultProps = {
  ...(TextInput as unknown as ScalableDefaults).defaultProps,
  maxFontSizeMultiplier: FONT_SCALE_CAP,
};

LogBox.ignoreLogs([
  'onAnimatedValueUpdate',
  'Sending `onAnimatedValueUpdate`',
  'Warning: An update to',
  'Non-serializable values were found in the navigation state',
  'new NativeEventEmitter',
  'EventEmitter.removeListener',
  '[expo-notifications]',
  'No native splash screen',
]);
if (__DEV__) LogBox.ignoreAllLogs();

import RootNavigator from '@/navigation/RootNavigator';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useTabBarLayout } from '@/hooks/useTabBarLayout';
import { setupPushListeners } from '@/services/pushService';
import { useDrawsStore } from '@/store/drawsStore';
import { installGlobalErrorHandler } from '@/services/errorReporter';

// Capture uncaught JS errors as early as possible (idempotent).
installGlobalErrorHandler();

// Keep native splash visible until app data is ready, then hide in RootNavigator.
SplashScreen.preventAutoHideAsync().catch(() => {});

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

  useEffect(() => {
    return setupPushListeners(() => {
      useDrawsStore.getState().refresh().catch(() => {});
    });
  }, []);

  return <RootNavigator />;
}

function ToastHost() {
  const { tabBarHeight } = useTabBarLayout();
  return <Toast bottomOffset={tabBarHeight + 8} />;
}

export default function App() {
  const colors = useColors();

  return (
    <GestureHandlerRootView style={[styles.root, { backgroundColor: colors.surfacePrimary }]}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <Suspense fallback={<LoadingFallback />}>
            <AppInner />
          </Suspense>
        </ErrorBoundary>
        <ToastHost />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1 },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
