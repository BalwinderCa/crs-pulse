import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './Button';
import { palette, spacing, typography } from '@/theme';

type Props = {
  message?: string;
  onRetry?: () => void;
};

export function ErrorState({ message = 'Something went wrong.', onRetry }: Props) {
  return (
    <View style={styles.container} accessibilityRole="alert">
      <Ionicons name="alert-circle-outline" size={48} color={palette.danger} />
      <Text style={styles.title}>Error</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <Button title="Try Again" onPress={onRetry} variant="outline" size="sm" style={styles.btn} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing['2xl'],
    gap: spacing.md,
  },
  title: {
    color: palette.textPrimary,
    fontSize: typography.lg,
    fontWeight: typography.semibold,
  },
  message: {
    color: palette.textSecondary,
    fontSize: typography.base,
    textAlign: 'center',
  },
  btn: { marginTop: spacing.sm },
});
