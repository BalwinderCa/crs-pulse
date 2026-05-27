import React, { forwardRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { palette, borderRadius, typography, spacing } from '@/theme';

type Props = TextInputProps & {
  label?: string;
  error?: string;
  hint?: string;
  containerStyle?: ViewStyle;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
};

export const Input = forwardRef<TextInput, Props>(function Input(
  { label, error, hint, containerStyle, leftIcon, rightIcon, onRightIconPress, secureTextEntry, style, ...rest },
  ref,
) {
  const [isSecure, setIsSecure] = useState(secureTextEntry);
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? palette.danger
    : focused
    ? palette.blue
    : palette.surfaceTertiary;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View style={[styles.inputWrap, { borderColor }]}>
        {leftIcon && (
          <Ionicons
            name={leftIcon}
            size={18}
            color={palette.gray400}
            style={styles.leftIcon}
          />
        )}

        <TextInput
          ref={ref}
          style={[styles.input, style]}
          placeholderTextColor={palette.gray400}
          selectionColor={palette.blue}
          secureTextEntry={isSecure}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoCapitalize="none"
          autoCorrect={false}
          accessible
          accessibilityLabel={label}
          accessibilityState={{ selected: focused }}
          {...rest}
        />

        {secureTextEntry && (
          <TouchableOpacity
            onPress={() => setIsSecure((s) => !s)}
            style={styles.rightIcon}
            accessibilityRole="button"
            accessibilityLabel={isSecure ? 'Show password' : 'Hide password'}
          >
            <Ionicons
              name={isSecure ? 'eye-outline' : 'eye-off-outline'}
              size={18}
              color={palette.gray400}
            />
          </TouchableOpacity>
        )}

        {rightIcon && !secureTextEntry && (
          <TouchableOpacity
            onPress={onRightIconPress}
            style={styles.rightIcon}
            accessibilityRole="button"
          >
            <Ionicons name={rightIcon} size={18} color={palette.gray400} />
          </TouchableOpacity>
        )}
      </View>

      {error && <Text style={styles.error}>{error}</Text>}
      {hint && !error && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  label: {
    color: palette.textSecondary,
    fontSize: typography.sm,
    fontWeight: typography.medium,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.surfaceInput,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    paddingHorizontal: spacing.md,
    height: 52,
  },
  leftIcon: { marginRight: spacing.sm },
  rightIcon: { marginLeft: spacing.sm, padding: spacing.xs },
  input: {
    flex: 1,
    color: palette.textPrimary,
    fontSize: typography.base,
  },
  error: {
    color: palette.danger,
    fontSize: typography.xs,
  },
  hint: {
    color: palette.textMuted,
    fontSize: typography.xs,
  },
});
