import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, typography, borderRadius } from '@/theme';
import { useColors } from '@/hooks/useColors';
import { useAccentColor } from '@/hooks/useAccentColor';
import { BuddyAvatar, buddyChoices } from './BuddyAvatar';
import { Avatar } from './TimelineCards';

// With the initial in front, a full 4 × 3 grid.
const GRID = 11;

/** A bottom sheet of preset avatars; Shuffle deals a new set. Picking one closes it. */
export function AvatarPicker({ visible, alias, selected, onSelect, onClose }: {
  visible: boolean;
  alias: string;
  selected: string | undefined;
  onSelect: (id: string | undefined) => void;
  onClose: () => void;
}) {
  const c = useColors();
  const accent = useAccentColor();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => { if (visible) setIds(buddyChoices(GRID, selected)); }, [visible, selected]);

  const pick = (id: string | undefined) => { onSelect(id); onClose(); };
  const ring = (on: boolean) => [s.cell, { borderColor: on ? accent : 'transparent' }];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose} accessibilityLabel={t('community.avatarTitle')} />
      <View style={[s.sheet, { backgroundColor: c.surfaceCard, paddingBottom: insets.bottom + spacing.md }]}>
        <View style={[s.handle, { backgroundColor: c.border }]} />
        <View style={s.head}>
          <Text style={[s.title, { color: c.textPrimary }]}>{t('community.avatarTitle')}</Text>
          <TouchableOpacity ph-label="community-avatar-shuffle" onPress={() => setIds(buddyChoices(GRID))} style={s.shuffle}
            accessibilityRole="button">
            <Ionicons name="shuffle" size={18} color={accent} />
            <Text style={[s.shuffleTxt, { color: accent }]}>{t('community.avatarShuffle')}</Text>
          </TouchableOpacity>
        </View>
        <View style={s.grid}>
          {[undefined, ...ids].reduce<(string | undefined)[][]>((rows, id, i) => {
            if (i % 4 === 0) rows.push([]);
            rows[rows.length - 1]!.push(id);
            return rows;
          }, []).map((row, r) => (
            <View key={r} style={s.row}>
              {row.map((id, i) => (
                <TouchableOpacity key={id ?? 'initial'} style={ring(id === selected)} onPress={() => pick(id)}
                  accessibilityRole="button" accessibilityState={{ selected: id === selected }}
                  accessibilityLabel={id ? t('community.avatarN', { n: r * 4 + i }) : t('community.avatarInitial')}>
                  {id ? <BuddyAvatar id={id} size={56} /> : <Avatar alias={alias || t('community.anonymous')} size={56} />}
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)' },
  sheet: { borderTopLeftRadius: borderRadius.lg, borderTopRightRadius: borderRadius.lg, paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: spacing.md },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  title: { fontSize: typography.lg, fontWeight: typography.bold },
  shuffle: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, paddingHorizontal: spacing.sm },
  shuffleTxt: { fontSize: typography.sm, fontWeight: typography.semibold },
  grid: { gap: spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  cell: { width: 70, height: 70, alignItems: 'center', justifyContent: 'center', borderRadius: 35, borderWidth: 3 },
});
