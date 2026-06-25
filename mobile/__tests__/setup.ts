// NOTE: extend-expect is loaded via setupFilesAfterEnv in package.json —
// this file runs in the setupFiles phase, before jest globals exist.

// Mock react-i18next so components using useTranslation work in tests.
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      // Return the last segment of the key with basic interpolation
      const base = key.split('.').pop() ?? key;
      if (!opts) return base;
      return Object.entries(opts).reduce(
        (s, [k, v]) => s.replace(`{{${k}}}`, String(v)),
        base,
      );
    },
    i18n: { changeLanguage: jest.fn() },
    ready: true,
  }),
  initReactI18next: { type: '3rdParty', init: jest.fn() },
}));

jest.mock('@/i18n', () => ({
  default: { changeLanguage: jest.fn().mockResolvedValue(undefined) },
}));

// Mock Expo modules
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('@react-native-community/netinfo', () => ({
  fetch:           jest.fn().mockResolvedValue({ isConnected: true, isInternetReachable: true }),
  addEventListener: jest.fn().mockReturnValue(jest.fn()),
}));

// virtual: package not installed in this workspace (native module, EAS build only)
jest.mock('@react-native-firebase/app', () => ({}), { virtual: true });
jest.mock('@react-native-firebase/messaging', () => () => ({
  requestPermission:  jest.fn().mockResolvedValue(1),
  getToken:           jest.fn().mockResolvedValue('test-fcm-token'),
  onMessage:          jest.fn().mockReturnValue(jest.fn()),
  onNotificationOpenedApp: jest.fn().mockReturnValue(jest.fn()),
  getInitialNotification:  jest.fn().mockResolvedValue(null),
  deleteToken:        jest.fn(),
  AuthorizationStatus: { AUTHORIZED: 1, PROVISIONAL: 2 },
}), { virtual: true });

jest.mock('expo-device', () => ({
  isDevice: true,
  brand:    'Test',
  modelName: 'TestPhone',
}));

jest.mock('expo-notifications', () => ({
  setNotificationHandler:      jest.fn(),
  getPermissionsAsync:         jest.fn().mockResolvedValue({ status: 'granted' }),
  requestPermissionsAsync:     jest.fn().mockResolvedValue({ status: 'granted' }),
  scheduleNotificationAsync:   jest.fn(),
}));

jest.mock('react-native-toast-message', () => ({
  default: { show: jest.fn() },
  show: jest.fn(),
}));
jest.mock('react-native-reanimated', () =>
  require('react-native-reanimated/mock'),
);

jest.mock('react-native-iap', () => ({
  initConnection: jest.fn(() => Promise.resolve(true)),
  endConnection: jest.fn(() => Promise.resolve()),
  flushFailedPurchasesCachedAsPendingAndroid: jest.fn(() => Promise.resolve()),
  getProducts: jest.fn(() => Promise.resolve([])),
  requestPurchase: jest.fn(() => Promise.resolve()),
  getAvailablePurchases: jest.fn(() => Promise.resolve([])),
  finishTransaction: jest.fn(() => Promise.resolve()),
  purchaseUpdatedListener: jest.fn(() => ({ remove: jest.fn() })),
  purchaseErrorListener: jest.fn(() => ({ remove: jest.fn() })),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: ({ name }: { name: string }) => name,
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView:       ({ children }: { children: React.ReactNode }) => children,
  SafeAreaProvider:   ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
