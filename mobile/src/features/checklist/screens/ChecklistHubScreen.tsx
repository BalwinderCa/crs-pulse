import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/layout/AppHeader';
import { STORAGE_KEYS } from '@/constants';
import { palette, spacing, typography, borderRadius } from '@/theme';
import { useColors } from '@/hooks/useColors';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { useAccentColor } from '@/hooks/useAccentColor';
import { CHECKLIST_PROGRAMS, type ChecklistProgram } from '../data/checklists';
import type { RootStackParamList } from '@/types';
import React from 'react';

function totalItems(p: ChecklistProgram): number {
  return p.sections.reduce((n, s) => n + s.items.length, 0);
}

function storageKey(programId: string): string {
  return `${STORAGE_KEYS.DOC_CHECKLIST}:${programId}`;
}

export default function ChecklistHubScreen() {
  const c = useColors();
  const accent = useAccentColor();
  const insets = useSafeAreaInsets();
  const { contentFrameStyle } = useResponsiveLayout();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [progress, setProgress] = useState<Record<string, number>>({});

  const loadProgress = React.useCallback(() => {
    Promise.all(
      CHECKLIST_PROGRAMS.map(async (p) => {
        try {
          const raw = await AsyncStorage.getItem(storageKey(p.id));
          const checked = raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
          return [p.id, Object.values(checked).filter(Boolean).length] as const;
        } catch {
          return [p.id, 0] as const;
        }
      }),
    ).then((entries) => setProgress(Object.fromEntries(entries)));
  }, []);

  useEffect(loadProgress, [loadProgress]);
  // Refresh counts when returning from a detail screen
  useFocusEffect(loadProgress);

  return (
    <View style={[s.wrap, { backgroundColor: c.surfacePrimary }]}>
      <AppHeader title="Document Checklists" variant="stack" />

      <ScrollView
        contentContainerStyle={[s.body, contentFrameStyle, { paddingBottom: insets.bottom + spacing['2xl'] }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[s.intro, { color: c.textSecondary }]}>
          Pick your program to track the documents you need. Your IRCC account checklist is always
          the official list.
        </Text>

        {CHECKLIST_PROGRAMS.map((p) => {
          const total = totalItems(p);
          const done = progress[p.id] ?? 0;
          const pct = total === 0 ? 0 : done / total;
          const complete = done >= total && total > 0;
          return (
            <TouchableOpacity
              key={p.id}
              style={[s.card, { borderColor: c.border, backgroundColor: c.surfaceCard }]}
              onPress={() => navigation.navigate('DocumentChecklistDetail', { programId: p.id })}
              activeOpacity={0.65}
            >
              <View style={[s.iconBox, { backgroundColor: accent + '15' }]}>
                <Ionicons name={p.icon as any} size={22} color={accent} />
              </View>
              <View style={s.cardText}>
                <Text style={[s.cardTitle, { color: c.textPrimary }]}>{p.label}</Text>
                <Text style={[s.cardBlurb, { color: c.textMuted }]}>{p.blurb}</Text>
                <View style={[s.track, { backgroundColor: c.surfaceTertiary }]}>
                  <View
                    style={[
                      s.fill,
                      { backgroundColor: complete ? palette.success : accent, width: `${pct * 100}%` },
                    ]}
                  />
                </View>
                <Text style={[s.count, { color: complete ? palette.success : c.textMuted }]}>
                  {done} of {total} ready{complete ? ' · complete' : ''}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  wrap:  { flex: 1 },
  body:  { padding: spacing.base, paddingTop: spacing.lg, gap: spacing.sm },
  intro: { fontSize: typography.sm, lineHeight: 20, marginBottom: spacing.xs },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    borderWidth: StyleSheet.hairlineWidth, borderRadius: borderRadius.md, padding: spacing.md,
  },
  iconBox: { width: 44, height: 44, borderRadius: borderRadius.md,
             alignItems: 'center', justifyContent: 'center' },
  cardText:  { flex: 1, gap: 3 },
  cardTitle: { fontSize: typography.base, fontWeight: typography.bold },
  cardBlurb: { fontSize: typography.xs, lineHeight: 16 },
  track:     { height: 5, borderRadius: 3, overflow: 'hidden', marginTop: 4 },
  fill:      { height: '100%', borderRadius: 3 },
  count:     { fontSize: typography.xs, fontWeight: typography.semibold, marginTop: 1 },
});
