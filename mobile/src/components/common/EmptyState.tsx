import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { palette, spacing, typography } from '@/theme';
import { useColors } from '@/hooks/useColors';
import type { Colors } from '@/theme/colors';

type Props = {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
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
  });
}

export function EmptyState({ icon = 'document-outline', title, description }: Props) {
  const colors = useColors();
  const styles = makeStyles(colors);
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={56} color={palette.gray400} />
      <Text style={styles.title}>{title}</Text>
      {description && <Text style={styles.desc}>{description}</Text>}
    </View>
  );
}
