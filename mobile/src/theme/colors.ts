export const darkColors = {
  // Surfaces
  surfacePrimary:   '#0A1628',
  surfaceSecondary: '#112040',
  surfaceTertiary:  '#1A2F50',
  surfaceCard:      '#0F1E38',
  surfaceInput:     '#0D1A30',
  // Card gradient pair
  gradientStart:    '#112040',
  gradientEnd:      '#0D1F3C',
  // Text
  textPrimary:   '#FFFFFF',
  textSecondary: '#9BAEC8',
  textMuted:     '#4A5568',
  // Border / divider
  border: '#1A2F50',
} as const;

export const lightColors = {
  // Surfaces
  surfacePrimary:   '#F0F4FA',
  surfaceSecondary: '#FFFFFF',
  surfaceTertiary:  '#E2E8F2',
  surfaceCard:      '#FFFFFF',
  surfaceInput:     '#EEF2F7',
  // Card gradient pair
  gradientStart:    '#EEF2F7',
  gradientEnd:      '#E8EDF5',
  // Text
  textPrimary:   '#0A1628',
  textSecondary: '#4A5568',
  textMuted:     '#9BAEC8',
  // Border / divider
  border: '#D4DCE8',
} as const;

export type Colors = typeof darkColors;
