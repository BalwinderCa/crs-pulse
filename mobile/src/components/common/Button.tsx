import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableOpacityProps,
  View,
} from 'react-native';
import { palette, borderRadius, typography, spacing } from '@/theme';
import { useColors } from '@/hooks/useColors';
import type { Colors } from '@/theme/colors';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

type Props = TouchableOpacityProps & {
  title: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
};

function makeVariantStyles(c: Colors) {
  return {
    primary:   { bg: palette.blue,         text: palette.white,         border: palette.blue },
    secondary: { bg: c.surfaceTertiary,    text: c.textPrimary,         border: c.surfaceTertiary },
    outline:   { bg: 'transparent',        text: palette.blue,          border: palette.blue },
    ghost:     { bg: 'transparent',        text: c.textSecondary,       border: 'transparent' },
    danger:    { bg: palette.danger,       text: palette.white,         border: palette.danger },
  } as const;
}

const sizeStyles = {
  sm: { height: 36, px: spacing.md,   fontSize: typography.sm },
  md: { height: 48, px: spacing.base, fontSize: typography.base },
  lg: { height: 56, px: spacing.xl,   fontSize: typography.md },
} as const;

const styles = StyleSheet.create({
  base: {
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  content: { flexDirection: 'row', alignItems: 'center' },
  iconWrap: { marginRight: spacing.sm },
  text: { fontWeight: typography.semibold, letterSpacing: 0.2 },
});

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  fullWidth = false,
  disabled,
  style,
  ...rest
}: Props) {
  const colors = useColors();
  const v = makeVariantStyles(colors)[variant];
  const s = sizeStyles[size];
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      style={[
        styles.base,
        {
          backgroundColor: v.bg,
          borderColor: v.border,
          height: s.height,
          paddingHorizontal: s.px,
          opacity: isDisabled ? 0.5 : 1,
          alignSelf: fullWidth ? 'stretch' : 'auto',
        },
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator size="small" color={v.text} />
      ) : (
        <View style={styles.content}>
          {icon && <View style={styles.iconWrap}>{icon}</View>}
          <Text style={[styles.text, { color: v.text, fontSize: s.fontSize }]}>
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
