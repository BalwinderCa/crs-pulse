import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { palette, spacing, typography, borderRadius } from '@/theme';
import { useColors } from '@/hooks/useColors';
import type { Colors } from '@/theme/colors';

type Props = {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
};

function makeStyles(c: Colors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing['2xl'],
      gap: spacing.sm,
    },
    title: { color: c.textPrimary, fontSize: typography.lg, fontWeight: typography.semibold, textAlign: 'center' },
    desc:  { color: c.textSecondary, fontSize: typography.sm, textAlign: 'center', lineHeight: 20 },
    action: {
      marginTop: spacing.md,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.xl,
      borderRadius: borderRadius.md,
      backgroundColor: palette.blueMid,
    },
    actionText: { color: palette.white, fontSize: typography.base, fontWeight: typography.semibold },
  });
}

export function EmptyState({ icon = 'document-outline', title, description, actionLabel, onAction }: Props) {
  const colors = useColors();
  const styles = makeStyles(colors);
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={56} color={palette.gray400} />
      <Text style={styles.title}>{title}</Text>
      {description && <Text style={styles.desc}>{description}</Text>}
      {actionLabel && onAction && (
        <TouchableOpacity accessibilityRole="button" style={styles.action} onPress={onAction}>
          <Text style={styles.actionText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
