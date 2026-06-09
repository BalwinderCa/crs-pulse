import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { palette, borderRadius, typography, spacing } from '@/theme';
import { useColors } from '@/hooks/useColors';
import type { Colors } from '@/theme/colors';

type Variant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

function makeVariantColors(c: Colors): Record<Variant, { bg: string; text: string; border: string }> {
  return {
    success: { bg: palette.successLight, text: palette.success, border: palette.success + '30' },
    warning: { bg: palette.warningLight, text: palette.warning, border: palette.warning + '30' },
    danger:  { bg: palette.dangerLight,  text: palette.danger,  border: palette.danger  + '30' },
    info:    { bg: palette.blueFaint,    text: palette.blueLight, border: palette.blue + '30' },
    neutral: { bg: c.surfaceTertiary,   text: c.textSecondary, border: c.border },
  };
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    borderWidth: 1,
  },
  text: {
    fontSize: typography.xs,
    fontWeight: typography.bold,
    letterSpacing: 0.3,
  },
});

type Props = { label: string; variant?: Variant };

export function Badge({ label, variant = 'neutral' }: Props) {
  const colors = useColors();
  const vc = makeVariantColors(colors)[variant];
  return (
    <View style={[styles.badge, { backgroundColor: vc.bg, borderColor: vc.border }]}>
      <Text style={[styles.text, { color: vc.text }]}>{label}</Text>
    </View>
  );
}
