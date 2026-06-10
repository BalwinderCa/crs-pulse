// NOTE: extend-expect is loaded via setupFilesAfterEnv in package.json —
// this file runs in the setupFiles phase, before jest globals exist.

// Mock Expo modules
jest.mock('expo-secure-store', () => ({
  setItemAsync:    jest.fn(),
  deleteItemAsync: jest.fn(),
  getItemAsync:    jest.fn().mockResolvedValue(null),
}));

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

jest.mock('react-native-linear-gradient', () => 'LinearGradient');
jest.mock('react-native-chart-kit', () => ({ LineChart: 'LineChart' }));
jest.mock('react-native-toast-message', () => ({
  default: { show: jest.fn() },
  show: jest.fn(),
}));
jest.mock('react-native-reanimated', () =>
  require('react-native-reanimated/mock'),
);

jest.mock('@expo/vector-icons', () => ({
  Ionicons: ({ name }: { name: string }) => name,
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView:       ({ children }: { children: React.ReactNode }) => children,
  SafeAreaProvider:   ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
