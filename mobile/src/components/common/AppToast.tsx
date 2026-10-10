import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ToastConfig } from 'react-native-toast-message';
import { borderRadius, palette, spacing, typography } from '@/theme';
import { useColors, useResolvedScheme } from '@/hooks/useColors';

type Kind = 'success' | 'error' | 'info';

const KIND: Record<Kind, { icon: keyof typeof Ionicons.glyphMap; tint: string }> = {
  success: { icon: 'checkmark-circle', tint: palette.success },
  error:   { icon: 'alert-circle',     tint: palette.danger },
  info:    { icon: 'information-circle', tint: palette.info },
};

/**
 * Toast drawn like the app's cards (surface, hairline border, rounded corners,
 * tinted status icon) instead of react-native-toast-message's stock white box
 * with a coloured left strip. Follows the app's light/dark theme setting.
 */
function ToastCard({ kind, text1, text2 }: { kind: Kind; text1?: string | undefined; text2?: string | undefined }) {
  const c = useColors();
  const dark = useResolvedScheme() === 'dark';
  const { icon, tint } = KIND[kind];
  return (
    <View
      // Shadows barely show on dark surfaces, so dark mode lifts the toast with
      // the raised surface tone and a firmer border instead.
      style={[s.card, dark
        ? { backgroundColor: c.surfaceTertiary, borderColor: c.border, borderWidth: 1 }
        : { backgroundColor: c.surfaceCard, borderColor: c.border }]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <View style={[s.iconBox, { backgroundColor: tint + '1F' }]}>
        <Ionicons name={icon} size={20} color={tint} />
      </View>
      <View style={s.text}>
        {text1 ? <Text style={[s.title, { color: c.textPrimary }]} numberOfLines={2}>{text1}</Text> : null}
        {text2 ? <Text style={[s.body, { color: c.textSecondary }]} numberOfLines={3}>{text2}</Text> : null}
      </View>
    </View>
  );
}

const card = (kind: Kind): ToastConfig[string] =>
  (p) => <ToastCard kind={kind} text1={p.text1} text2={p.text2} />;

export const toastConfig: ToastConfig = {
  success: card('success'),
  error:   card('error'),
  info:    card('info'),
};

const s = StyleSheet.create({
  card: {
    width: '92%',
    maxWidth: 480,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  iconBox: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  text:    { flex: 1, gap: 2 },
  title:   { fontSize: typography.sm, fontWeight: typography.bold },
  body:    { fontSize: typography.xs, lineHeight: 17 },
});
