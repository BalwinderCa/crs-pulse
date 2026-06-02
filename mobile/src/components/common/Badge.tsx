import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { palette, borderRadius, typography, spacing } from '@/theme';
import { useColors } from '@/hooks/useColors';
import type { Colors } from '@/theme/colors';

type Variant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

function makeVariantColors(c: Colors): Record<Variant, { bg: string; text: string }> {
  return {
    success: { bg: palette.successLight, text: palette.success },
    warning: { bg: palette.warningLight, text: palette.warning },
    danger:  { bg: palette.dangerLight,  text: palette.danger  },
    info:    { bg: palette.blueFaint,    text: palette.blueLight },
    neutral: { bg: c.surfaceTertiary,   text: c.textSecondary },
  };
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: typography.xs,
    fontWeight: typography.semibold,
  },
});

type Props = { label: string; variant?: Variant };

export function Badge({ label, variant = 'neutral' }: Props) {
  const colors = useColors();
  const vc = makeVariantColors(colors)[variant];
  return (
    <View style={[styles.badge, { backgroundColor: vc.bg }]}>
      <Text style={[styles.text, { color: vc.text }]}>{label}</Text>
    </View>
  );
}
