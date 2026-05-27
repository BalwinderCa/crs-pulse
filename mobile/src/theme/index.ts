import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const palette = {
  // Brand - Canadian government inspired
  canadaRed: '#FF0000',
  navyDark: '#0A1628',
  navy: '#0D1F3C',
  navyLight: '#1A2F50',
  blue: '#1A6DFF',
  blueMid: '#1558CC',
  blueLight: '#3D88FF',
  blueFaint: '#1A6DFF1A',

  // Semantic
  success: '#00C875',
  successLight: '#00C87520',
  warning: '#FFB800',
  warningLight: '#FFB80020',
  danger: '#FF4D4D',
  dangerLight: '#FF4D4D20',

  // Neutrals
  white: '#FFFFFF',
  offWhite: '#F5F7FA',
  gray50: '#F8FAFC',
  gray100: '#EEF2F7',
  gray200: '#D4DCE8',
  gray300: '#9BAEC8',
  gray400: '#6B7FA3',
  gray500: '#4A5568',
  gray600: '#2D3748',
  gray700: '#1A2332',
  gray800: '#121C2D',
  gray900: '#0A1220',

  // Dark mode surfaces
  surfacePrimary: '#0A1628',
  surfaceSecondary: '#112040',
  surfaceTertiary: '#1A2F50',
  surfaceCard: '#0F1E38',
  surfaceInput: '#0D1A30',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#9BAEC8',
  textMuted: '#4A5568',

  transparent: 'transparent',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
} as const;

export const borderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
} as const;

export const typography = {
  // Font sizes
  xs: 11,
  sm: 13,
  base: 15,
  md: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 32,
  '5xl': 40,
  '6xl': 48,

  // Line heights
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.75,

  // Font weights
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
} as const;

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  glow: {
    shadowColor: palette.blue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
} as const;

export const layout = {
  screenWidth: SCREEN_WIDTH,
  screenHeight: SCREEN_HEIGHT,
  horizontalPadding: spacing.base,
  headerHeight: 56,
  tabBarHeight: 80,
  cardMinHeight: 80,
} as const;

export const animation = {
  fast: 150,
  normal: 250,
  slow: 400,
} as const;

const theme = {
  palette,
  spacing,
  borderRadius,
  typography,
  shadows,
  layout,
  animation,
} as const;

export type Theme = typeof theme;
export default theme;
