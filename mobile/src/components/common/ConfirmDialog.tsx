import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius, palette, spacing, typography } from '@/theme';
import { useColors, useResolvedScheme } from '@/hooks/useColors';
import { useAccentColor } from '@/hooks/useAccentColor';
import { Button } from '@/components/common/Button';

type Props = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  /** Destructive actions get a red icon and button; others use the accent color. */
  destructive?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
};

/**
 * In-app confirmation dialog, drawn with the app's own card, buttons and theme
 * instead of the platform Alert, so it follows light/dark mode and the accent
 * color. Tapping the backdrop or Android back cancels.
 */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  destructive = false,
  icon = destructive ? 'warning-outline' : 'help-circle-outline',
  onConfirm,
  onCancel,
}: Props) {
  const c = useColors();
  const accent = useAccentColor();
  const dark = useResolvedScheme() === 'dark';
  const tint = destructive ? palette.danger : accent;
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <View style={s.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={busy ? undefined : onCancel} accessibilityLabel={cancelLabel} />
        <View
          style={[s.card, { backgroundColor: dark ? c.surfaceTertiary : c.surfaceCard, borderColor: c.border }]}
          accessibilityViewIsModal
        >
          <View style={[s.iconBox, { backgroundColor: tint + '1F' }]}>
            <Ionicons name={icon} size={26} color={tint} />
          </View>
          <Text style={[s.title, { color: c.textPrimary }]} accessibilityRole="header">{title}</Text>
          <Text style={[s.message, { color: c.textSecondary }]}>{message}</Text>
          <View style={s.actions}>
            <Button
              title={confirmLabel}
              variant={destructive ? 'danger' : 'primary'}
              onPress={confirm}
              loading={busy}
              fullWidth
            />
            <Button title={cancelLabel} variant="secondary" onPress={onCancel} disabled={busy} fullWidth />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    paddingTop: spacing.xl,
    paddingBottom: spacing.base,
    paddingHorizontal: spacing.base,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: { fontSize: typography.lg, fontWeight: typography.bold, textAlign: 'center' },
  message: {
    fontSize: typography.sm,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  actions: { alignSelf: 'stretch', gap: spacing.sm },
});
