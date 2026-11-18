import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from '@/components/common/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, typography, borderRadius } from '@/theme';
import { useColors } from '@/hooks/useColors';
import { useAccentColor } from '@/hooks/useAccentColor';

export type SheetOption<T> = { value: T; label: string };

/** A bottom sheet with one choice per row; picking one closes it. */
export function FilterSheet<T>({ visible, title, options, selected, onSelect, onClose }: {
  visible: boolean;
  title: string;
  options: SheetOption<T>[];
  selected: T;
  onSelect: (value: T) => void;
  onClose: () => void;
}) {
  const c = useColors();
  const accent = useAccentColor();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose} accessibilityLabel={title} />
      <View style={[s.sheet, { backgroundColor: c.surfaceCard, paddingBottom: insets.bottom + spacing.md }]}>
        <View style={[s.handle, { backgroundColor: c.border }]} />
        <Text style={[s.title, { color: c.textPrimary }]}>{title}</Text>
        <ScrollView style={s.list} showsVerticalScrollIndicator={false}>
          {options.map((o) => {
            const on = o.value === selected;
            return (
              <TouchableOpacity key={String(o.value)} style={[s.row, { borderBottomColor: c.border }]}
                onPress={() => { onSelect(o.value); onClose(); }}
                accessibilityRole="button" accessibilityState={{ selected: on }}>
                <Text style={[s.rowTxt, { color: on ? accent : c.textPrimary, fontWeight: on ? typography.bold : typography.medium }]}>
                  {o.label}
                </Text>
                {on && <Ionicons name="checkmark" size={20} color={accent} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)' },
  sheet: { borderTopLeftRadius: borderRadius.lg, borderTopRightRadius: borderRadius.lg, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, maxHeight: '70%' },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: spacing.md },
  title: { fontSize: typography.lg, fontWeight: typography.bold, marginBottom: spacing.sm },
  list: { flexGrow: 0 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  rowTxt: { fontSize: typography.base },
});
