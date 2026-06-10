import { Dimensions } from 'react-native';
export { darkColors, lightColors, type Colors } from './colors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Static palette — brand & semantic colours that never change between modes.
export const palette = {
  // Brand — "Electric Indigo" system
  canadaRed: '#FF3B30',
  navyDark: '#060B14',
  navy: '#0A1220',
  navyLight: '#152035',
  blue: '#5B9EFF',
  blueMid: '#2D78EF',
  blueLight: '#7DB6FF',
  blueFaint: '#5B9EFF1A',
  blueGlow: '#5B9EFF30',

  // Semantic — more vivid/electric palette
  success: '#00E5A0',
  successLight: '#00E5A018',
  warning: '#FFB547',
  warningLight: '#FFB54718',
  danger: '#DC2626',      // 4.75:1 contrast on white — WCAG AA
  dangerLight: '#DC262618',

  // Neutrals (absolute, not mode-dependent)
  white: '#FFFFFF',
  offWhite: '#F0F5FF',
  gray50: '#F0F5FF',
  gray100: '#D8E4F5',
  gray200: '#B0C4DE',
  gray300: '#7A94B8',
  gray400: '#55708F',
  gray500: '#374D6E',
  gray600: '#243450',
  gray700: '#152035',
  gray800: '#0C1422',
  gray900: '#060B14',

  // Kept for backward-compat; prefer useColors() for surfaces/text
  surfacePrimary: '#060B14',
  surfaceSecondary: '#0C1422',
  surfaceTertiary: '#152035',
  surfaceCard: '#0F1A2E',
  surfaceInput: '#0A1220',
  textPrimary: '#F0F5FF',
  textSecondary: '#7A94B8',
  textMuted: '#6B85A8',

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
  '4xl': 34,
  '5xl': 42,
  '6xl': 52,

  // Line heights
  tight: 1.15,
  normal: 1.5,
  relaxed: 1.75,

  // Font weights
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
  black: '900' as const,
} as const;

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  glow: {
    shadowColor: palette.blue,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  glowSuccess: {
    shadowColor: palette.success,
    shadowOffset: { width: 0, height: 0 },
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
