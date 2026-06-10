import React from 'react';
import { StyleProp, StyleSheet, View, ViewProps, ViewStyle } from 'react-native';
import { borderRadius, spacing, shadows } from '@/theme';
import { useColors } from '@/hooks/useColors';
import type { Colors } from '@/theme/colors';

type Props = ViewProps & {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined' | 'glass' | undefined;
  padding?: keyof typeof spacing | 0 | undefined;
  style?: StyleProp<ViewStyle> | undefined;
};

function makeStyles(c: Colors) {
  return StyleSheet.create({
    base: {
      backgroundColor: c.surfaceCard,
      borderRadius: borderRadius.md,
      borderWidth: 0.3,
      borderColor: c.border,
    },
    elevated: {
      borderColor: c.border,
    },
    outlined: {
      backgroundColor: 'transparent',
      borderWidth: 0.3,
      borderColor: c.border,
    },
    glass: {
      backgroundColor: c.surfaceCard + 'CC',
      borderWidth: 0.3,
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
        variant === 'elevated' && [shadows.md, styles.elevated],
        variant === 'outlined' && styles.outlined,
        variant === 'glass' && styles.glass,
        padding !== 0 && { padding: spacing[padding as keyof typeof spacing] ?? spacing.base },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}
