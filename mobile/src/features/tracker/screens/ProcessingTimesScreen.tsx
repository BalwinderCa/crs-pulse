import { useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/layout/AppHeader';
import { spacing, typography, borderRadius } from '@/theme';
import { useColors } from '@/hooks/useColors';
import { useAccentColor } from '@/hooks/useAccentColor';
import {
  APPLICATION_CATEGORIES,
  PROCESSING_TIMES_UPDATED,
} from '../data/processingTimes';

const OFFICIAL_URL =
  'https://www.canada.ca/en/immigration-refugees-citizenship/services/application/check-processing-times.html';

function fmtMonths(months: number): string {
  if (months < 1) return '< 1 month';
  return months === 1 ? '1 month' : `${months} months`;
}

export default function ProcessingTimesScreen() {
  const c = useColors();
  const accent = useAccentColor();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState<string | null>(APPLICATION_CATEGORIES[0]?.id ?? null);

  return (
    <View style={[s.wrap, { backgroundColor: c.surfacePrimary }]}>
      <AppHeader title="Processing Times" variant="stack" />

      <ScrollView
        contentContainerStyle={[s.body, { paddingBottom: insets.bottom + spacing['2xl'] }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[s.intro, { color: c.textSecondary }]}>
          Typical IRCC processing times by application type. Last updated{' '}
          {PROCESSING_TIMES_UPDATED} · updated monthly.
        </Text>

        {APPLICATION_CATEGORIES.map((cat) => {
          const expanded = open === cat.id;
          return (
            <View
              key={cat.id}
              style={[s.card, { borderColor: c.border, backgroundColor: c.surfaceCard }]}
            >
              <TouchableOpacity
                style={s.catRow}
                onPress={() => setOpen(expanded ? null : cat.id)}
                activeOpacity={0.6}
                accessibilityRole="button"
                accessibilityState={{ expanded }}
              >
                <View style={[s.catIcon, { backgroundColor: accent + '15' }]}>
                  <Ionicons name={cat.icon as any} size={17} color={accent} />
                </View>
                <Text style={[s.catTitle, { color: c.textPrimary }]}>{cat.label}</Text>
                <Ionicons
                  name={expanded ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={expanded ? accent : c.textMuted}
                />
              </TouchableOpacity>

              {expanded &&
                cat.types.map((t, i) => (
                  <View
                    key={t.id}
                    style={[
                      s.typeRow,
                      i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
                    ]}
                  >
                    <View style={s.typeText}>
                      <Text style={[s.typeLabel, { color: c.textPrimary }]}>{t.label}</Text>
                      {(t.method || t.varies) && (
                        <Text style={[s.typeHint, { color: c.textMuted }]}>
                          {[t.method, t.varies ? 'varies by case/country' : null]
                            .filter(Boolean)
                            .join(' · ')}
                        </Text>
                      )}
                    </View>
                    <View style={[s.timeBadge, { backgroundColor: accent + '14' }]}>
                      <Text style={[s.timeText, { color: accent }]}>{fmtMonths(t.months)}</Text>
                    </View>
                  </View>
                ))}
            </View>
          );
        })}

        <TouchableOpacity
          style={[s.officialRow, { borderColor: c.border, backgroundColor: c.surfaceSecondary }]}
          onPress={() => Linking.openURL(OFFICIAL_URL)}
          activeOpacity={0.65}
        >
          <Ionicons name="open-outline" size={16} color={accent} />
          <Text style={[s.officialText, { color: c.textSecondary }]}>
            Check your exact case on the official IRCC tool (canada.ca)
          </Text>
        </TouchableOpacity>

        <Text style={[s.disclaimer, { color: c.textMuted }]}>
          Estimates, not guarantees. Processing times may increase when more people apply than
          spaces available under the Immigration Levels Plan.
        </Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  wrap:  { flex: 1 },
  body:  { padding: spacing.base, paddingTop: spacing.lg, gap: spacing.sm },
  intro: { fontSize: typography.sm, lineHeight: 20, marginBottom: spacing.xs },

  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: borderRadius.md,
          paddingHorizontal: spacing.md },
  catRow:   { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  catIcon:  { width: 32, height: 32, borderRadius: borderRadius.md,
              alignItems: 'center', justifyContent: 'center' },
  catTitle: { flex: 1, fontSize: typography.sm, fontWeight: typography.bold },

  typeRow:  { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm + 2 },
  typeText: { flex: 1, gap: 1 },
  typeLabel:{ fontSize: typography.sm, fontWeight: typography.medium, lineHeight: 19 },
  typeHint: { fontSize: typography.xs },
  timeBadge:{ paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: borderRadius.md },
  timeText: { fontSize: typography.xs, fontWeight: typography.bold },

  officialRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth, borderRadius: borderRadius.md,
    padding: spacing.md, marginTop: spacing.xs,
  },
  officialText: { flex: 1, fontSize: typography.sm, fontWeight: typography.semibold },

  disclaimer: { fontSize: typography.xs, lineHeight: 18, textAlign: 'center',
                paddingHorizontal: spacing.sm },
});
