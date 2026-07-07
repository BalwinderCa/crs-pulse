import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Button } from './Button';
import { palette, spacing, typography } from '@/theme';
import { useColors } from '@/hooks/useColors';
import type { Colors } from '@/theme/colors';

type Props = { message?: string; onRetry?: () => void };

function makeStyles(c: Colors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing['2xl'],
      gap: spacing.md,
    },
    title:   { color: c.textPrimary,   fontSize: typography.lg,   fontWeight: typography.semibold },
    message: { color: c.textSecondary, fontSize: typography.base, textAlign: 'center' },
    btn: { marginTop: spacing.sm },
  });
}

export function ErrorState({ message, onRetry }: Props) {
  const colors = useColors();
  const { t } = useTranslation();
  const styles = makeStyles(colors);
  return (
    <View style={styles.container} accessibilityRole="alert">
      <Ionicons name="alert-circle-outline" size={48} color={palette.danger} />
      <Text style={styles.title}>{t('common.error')}</Text>
      <Text style={styles.message}>{message ?? t('common.somethingWrong')}</Text>
      {onRetry && <Button title={t('common.tryAgain')} onPress={onRetry} variant="outline" size="sm" style={styles.btn} />}
    </View>
  );
}
