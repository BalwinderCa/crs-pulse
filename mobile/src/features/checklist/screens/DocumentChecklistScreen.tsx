import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { STORAGE_KEYS } from '@/constants';
import { palette, spacing, typography, borderRadius } from '@/theme';
import { useColors } from '@/hooks/useColors';
import { useAccentColor } from '@/hooks/useAccentColor';
import { AppHeader } from '@/components/layout/AppHeader';
import { findChecklistProgram } from '../data/checklists';
import type { RootStackParamList } from '@/types';

export default function DocumentChecklistScreen() {
  const c = useColors();
  const accent = useAccentColor();
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<RootStackParamList, 'DocumentChecklistDetail'>>();
  const programId = route.params?.programId ?? 'express_entry';
  const program = findChecklistProgram(programId) ?? findChecklistProgram('express_entry')!;
  const storageKey = `${STORAGE_KEYS.DOC_CHECKLIST}:${program.id}`;

  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const totalItems = useMemo(
    () => program.sections.reduce((n, s) => n + s.items.length, 0),
    [program],
  );

  useEffect(() => {
    AsyncStorage.getItem(storageKey)
      .then((raw) => setChecked(raw ? JSON.parse(raw) : {}))
      .catch(() => {});
  }, [storageKey]);

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      AsyncStorage.setItem(storageKey, JSON.stringify(next)).catch(() => {});
      return next;
    });
  };

  const doneCount = useMemo(() => Object.values(checked).filter(Boolean).length, [checked]);
  const progress = totalItems === 0 ? 0 : doneCount / totalItems;
  const allDone = doneCount >= totalItems && totalItems > 0;

  return (
    <View style={[s.wrap, { backgroundColor: c.surfacePrimary }]}>
      <AppHeader title={program.label} variant="stack" />

      {/* Progress */}
      <View style={s.progressWrap}>
        <View style={s.progressLabels}>
          <Text style={[s.progressText, { color: c.textSecondary }]}>
            {doneCount} of {totalItems} documents ready
          </Text>
          <Text style={[s.progressText, { color: allDone ? palette.success : c.textMuted }]}>
            {Math.round(progress * 100)}%
          </Text>
        </View>
        <View style={[s.progressTrack, { backgroundColor: c.surfaceTertiary }]}>
          <View
            style={[
              s.progressFill,
              { backgroundColor: allDone ? palette.success : accent, width: `${progress * 100}%` },
            ]}
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[s.body, { paddingBottom: insets.bottom + spacing['2xl'] }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[s.intro, { color: c.textSecondary }]}>{program.intro}</Text>

        {program.sections.map((section) => {
          const sectionDone = section.items.every((i) => checked[i.id]);
          return (
            <View
              key={section.title}
              style={[s.card, { borderColor: c.border, backgroundColor: c.surfaceCard }]}
            >
              <View style={s.sectionHeader}>
                <Ionicons
                  name={section.icon as any}
                  size={16}
                  color={sectionDone ? palette.success : accent}
                />
                <Text style={[s.sectionTitle, { color: c.textPrimary }]}>{section.title}</Text>
                {sectionDone && <Ionicons name="checkmark-circle" size={16} color={palette.success} />}
              </View>
              {section.items.map((item, i) => {
                const isChecked = !!checked[item.id];
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      s.itemRow,
                      i < section.items.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
                    ]}
                    onPress={() => toggle(item.id)}
                    activeOpacity={0.6}
                  >
                    <Ionicons
                      name={isChecked ? 'checkbox' : 'square-outline'}
                      size={20}
                      color={isChecked ? palette.success : c.textMuted}
                    />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          s.itemLabel,
                          { color: isChecked ? c.textMuted : c.textPrimary },
                          isChecked && s.itemDone,
                        ]}
                      >
                        {item.label}
                      </Text>
                      {item.hint && (
                        <Text style={[s.itemHint, { color: c.textMuted }]}>{item.hint}</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1 },

  progressWrap:   { paddingHorizontal: spacing.base, paddingTop: spacing.md, gap: spacing.xs },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  progressText:   { fontSize: typography.sm, fontWeight: typography.semibold },
  progressTrack:  { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill:   { height: '100%', borderRadius: 3 },

  body:  { padding: spacing.base, paddingTop: spacing.md, gap: spacing.sm },
  intro: { fontSize: typography.sm, lineHeight: 20, marginBottom: spacing.xs },

  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: borderRadius.md, padding: spacing.md },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  sectionTitle: { flex: 1, fontSize: typography.sm, fontWeight: typography.bold,
                  letterSpacing: 0.3, textTransform: 'uppercase' },

  itemRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, paddingVertical: spacing.sm },
  itemLabel: { fontSize: typography.sm, fontWeight: typography.semibold, lineHeight: 19 },
  itemDone:  { textDecorationLine: 'line-through' },
  itemHint:  { fontSize: typography.xs, lineHeight: 16, marginTop: 1 },
});
