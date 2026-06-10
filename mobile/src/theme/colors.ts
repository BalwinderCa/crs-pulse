export const darkColors = {
  // Surfaces — Deep Space palette
  surfacePrimary:   '#060B14',
  surfaceSecondary: '#0C1422',
  surfaceTertiary:  '#152035',
  surfaceCard:      '#0F1A2E',
  surfaceInput:     '#0A1220',
  // Card gradient pair
  gradientStart:    '#101C30',
  gradientEnd:      '#0A1220',
  // Text
  textPrimary:   '#F0F5FF',
  textSecondary: '#7A94B8',
  textMuted:     '#6B85A8',  // 5.25:1 on #060B14 — WCAG AA
  // Border / divider
  border: '#1C2B45',
} as const;

export const lightColors = {
  // Surfaces
  surfacePrimary:   '#F2F6FF',
  surfaceSecondary: '#FFFFFF',
  surfaceTertiary:  '#E4ECF8',
  surfaceCard:      '#FFFFFF',
  surfaceInput:     '#EEF3FB',
  // Card gradient pair
  gradientStart:    '#EEF3FB',
  gradientEnd:      '#E8EFF8',
  // Text
  textPrimary:   '#060B14',
  textSecondary: '#4A5F80',
  textMuted:     '#4A6080',  // 5.85:1 on #F2F6FF — WCAG AA
  // Border / divider
  border: '#C8D8EE',
} as const;

export type Colors = Record<keyof typeof darkColors, string>;
