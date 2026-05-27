import React from 'react';
import { StyleSheet, View, ViewProps, ViewStyle } from 'react-native';
import { palette, borderRadius, spacing, shadows } from '@/theme';

type Props = ViewProps & {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: keyof typeof spacing | 0;
  style?: ViewStyle;
};

export function Card({ children, variant = 'default', padding = 'base', style, ...rest }: Props) {
  return (
    <View
      style={[
        styles.base,
        variant === 'elevated' && shadows.md,
        variant === 'outlined' && styles.outlined,
        padding !== 0 && { padding: spacing[padding as keyof typeof spacing] ?? spacing.base },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: palette.surfaceCard,
    borderRadius: borderRadius.lg,
  },
  outlined: {
    borderWidth: 1,
    borderColor: palette.surfaceTertiary,
  },
});
