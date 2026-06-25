import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { spacing, typography, borderRadius } from '@/theme';
import { useColors } from '@/hooks/useColors';
import { useAccentColor } from '@/hooks/useAccentColor';
import { AppHeader } from '@/components/layout/AppHeader';

const FAQ_COUNT = 9;

export default function FaqScreen() {
  const c = useColors();
  const accent = useAccentColor();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [open, setOpen] = useState<number | null>(0);

  const faqItems = useMemo(
    () => Array.from({ length: FAQ_COUNT }, (_, i) => ({
      q: t(`faq.q${i}`),
      a: t(`faq.a${i}`),
    })),
    [t],
  );

  return (
    <View style={[s.wrap, { backgroundColor: c.surfacePrimary }]}>
      <AppHeader title={t('faq.title')} variant="stack" />

      <ScrollView
        contentContainerStyle={[s.body, { paddingBottom: insets.bottom + spacing['2xl'] }]}
        showsVerticalScrollIndicator={false}
      >
        {faqItems.map((item, i) => {
          const expanded = open === i;
          return (
            <View
              key={i}
              style={[s.card, { borderColor: c.border, backgroundColor: c.surfaceCard }]}
            >
              <TouchableOpacity
                style={s.qRow}
                onPress={() => setOpen(expanded ? null : i)}
                activeOpacity={0.55}
                accessibilityRole="button"
                accessibilityState={{ expanded }}
                accessibilityLabel={item.q}
              >
                <Text style={[s.qText, { color: c.textPrimary }]}>{item.q}</Text>
                <Ionicons
                  name={expanded ? 'chevron-up' : 'chevron-down'}
                  size={17}
                  color={expanded ? accent : c.textMuted}
                />
              </TouchableOpacity>
              {expanded && (
                <Text style={[s.aText, { color: c.textSecondary }]}>{item.a}</Text>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  wrap:      { flex: 1 },
  body:      { padding: spacing.base, paddingTop: spacing.lg, gap: spacing.sm },
  card:      { borderWidth: StyleSheet.hairlineWidth, borderRadius: borderRadius.md,
               paddingHorizontal: spacing.md },
  qRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
               gap: spacing.sm, paddingVertical: spacing.md },
  qText:     { flex: 1, fontSize: typography.base, fontWeight: typography.semibold },
  aText:     { fontSize: typography.base, lineHeight: 24, paddingBottom: spacing.md },
});
