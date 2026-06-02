import React from 'react';
import { StyleSheet, View, ViewProps, ViewStyle } from 'react-native';
import { borderRadius, spacing, shadows } from '@/theme';
import { useColors } from '@/hooks/useColors';
import type { Colors } from '@/theme/colors';

type Props = ViewProps & {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: keyof typeof spacing | 0;
  style?: ViewStyle;
};

function makeStyles(c: Colors) {
  return StyleSheet.create({
    base: {
      backgroundColor: c.surfaceCard,
      borderRadius: borderRadius.lg,
    },
    outlined: {
      borderWidth: 1,
      borderColor: c.border,
    },
  });
}

export function Card({ children, variant = 'default', padding = 'base', style, ...rest }: Props) {
  const colors = useColors();
  const styles = makeStyles(colors);

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
