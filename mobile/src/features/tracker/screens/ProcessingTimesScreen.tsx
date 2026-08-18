import { useEffect, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { AppHeader } from '@/components/layout/AppHeader';
import { spacing, typography, borderRadius } from '@/theme';
import { useColors } from '@/hooks/useColors';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useNotificationsStore } from '@/features/notifications/store/notificationsStore';
import { useProcessingTimesStore } from '@/store/processingTimesStore';
import { useProcessingTimes } from '../hooks/useProcessingTimes';

const OFFICIAL_URL =
  'https://www.canada.ca/en/immigration-refugees-citizenship/services/application/check-processing-times.html';

function fmtMonths(months: number, t: (key: string, opts?: Record<string, unknown>) => string): string {
  if (months < 1) return t('processingTimes.lessThanOneMonth');
  if (months === 1) return t('processingTimes.oneMonth');
  return t('processingTimes.months', { months });
}

export default function ProcessingTimesScreen() {
  const c = useColors();
  const accent = useAccentColor();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { contentFrameStyle } = useResponsiveLayout();
  const { categories, updatedLabel } = useProcessingTimes();
  const [open, setOpen] = useState<string | null>(categories[0]?.id ?? null);

  // Opening this page is what "reading" a processing-times update means — clears
  // the red dot on the header hamburger and the side-menu row.
  const liveUpdated = useProcessingTimesStore((st) => st.updated);
  const markProcessingSeen = useNotificationsStore((st) => st.markProcessingSeen);
  useEffect(() => {
    if (liveUpdated) markProcessingSeen(liveUpdated);
  }, [liveUpdated, markProcessingSeen]);

  return (
    <View style={[s.wrap, { backgroundColor: c.surfacePrimary }]}>
      <AppHeader title={t('processingTimes.title')} variant="stack" />

      <ScrollView
        contentContainerStyle={[s.body, contentFrameStyle, { paddingBottom: insets.bottom + spacing['2xl'] }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[s.intro, { color: c.textSecondary }]}>
          {t('processingTimes.intro', { label: updatedLabel })}
        </Text>

        {categories.map((cat) => {
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
                cat.types.map((type, i) => (
                  <View
                    key={type.id}
                    style={[
                      s.typeRow,
                      i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
                    ]}
                  >
                    <View style={s.typeText}>
                      <Text style={[s.typeLabel, { color: c.textPrimary }]}>{type.label}</Text>
                      {(type.method || type.varies) && (
                        <Text style={[s.typeHint, { color: c.textMuted }]}>
                          {[type.method, type.varies ? t('processingTimes.variesByCase') : null]
                            .filter(Boolean)
                            .join(' · ')}
                        </Text>
                      )}
                    </View>
                    <View style={[s.timeBadge, { backgroundColor: accent + '14' }]}>
                      <Text style={[s.timeText, { color: accent }]}>{fmtMonths(type.months, t as (key: string, opts?: Record<string, unknown>) => string)}</Text>
                    </View>
                  </View>
                ))}
            </View>
          );
        })}

        <TouchableOpacity
          style={[s.officialRow, { borderColor: c.border, backgroundColor: c.surfaceSecondary }]}
          onPress={() => Linking.openURL(OFFICIAL_URL).catch(() => {})}
          activeOpacity={0.65}
        >
          <Ionicons name="open-outline" size={16} color={accent} />
          <Text style={[s.officialText, { color: c.textSecondary }]}>
            {t('processingTimes.officialTool')}
          </Text>
        </TouchableOpacity>

        <Text style={[s.disclaimer, { color: c.textMuted }]}>
          {t('processingTimes.disclaimer')}
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
