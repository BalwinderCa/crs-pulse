import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { palette, borderRadius, typography, spacing } from '@/theme';

type Variant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const variantColors: Record<Variant, { bg: string; text: string }> = {
  success: { bg: palette.successLight, text: palette.success },
  warning: { bg: palette.warningLight, text: palette.warning },
  danger:  { bg: palette.dangerLight,  text: palette.danger  },
  info:    { bg: palette.blueFaint,    text: palette.blueLight },
  neutral: { bg: palette.surfaceTertiary, text: palette.textSecondary },
};

type Props = {
  label: string;
  variant?: Variant;
};

export function Badge({ label, variant = 'neutral' }: Props) {
  const colors = variantColors[variant];
  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.text, { color: colors.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: typography.xs,
    fontWeight: typography.semibold,
  },
});
