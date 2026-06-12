import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, typography, borderRadius } from '@/theme';
import { useColors } from '@/hooks/useColors';
import { useAccentColor } from '@/hooks/useAccentColor';

const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: 'What is a CRS score?',
    a: 'The Comprehensive Ranking System (CRS) is how IRCC ranks candidates in the Express Entry pool, out of a maximum of 1,200 points. Points come from age, education, language ability, work experience, and additional factors like a provincial nomination. In each draw, IRCC invites the highest-ranked candidates to apply for permanent residency.',
  },
  {
    q: 'How accurate is the calculator?',
    a: 'CRS Pulse uses the current official IRCC CRS grid. Your result should match the official IRCC tool when you enter the same answers. The score shown here is an estimate for planning purposes — always confirm with the official IRCC CRS tool before making decisions.',
  },
  {
    q: 'Where does the draw data come from?',
    a: 'Draw history is fetched directly from the official IRCC public data feed on canada.ca. Nothing is edited or estimated — you see the same rounds of invitations IRCC publishes.',
  },
  {
    q: 'How do draw notifications work?',
    a: 'If you enable notifications, your device registers an anonymous push token with our server. When IRCC publishes a new draw, we send an alert. No personal or profile data ever leaves your device — only the anonymous token.',
  },
  {
    q: 'What are category-based draws?',
    a: 'Besides general draws, IRCC runs targeted draws for categories like French-language proficiency, healthcare, STEM, trades, education, and agriculture occupations. These often have lower CRS cut-offs, so qualifying for a category can mean an invitation at a lower score.',
  },
  {
    q: 'Why is my score different from the IRCC tool?',
    a: 'Double-check each answer — small differences (language test scores, ECA outcome, work history dates) shift points significantly. Also make sure the app is updated, since IRCC occasionally changes the grid. The official IRCC tool is always the final word.',
  },
  {
    q: 'How can I improve my CRS score?',
    a: 'The biggest levers: retake your language test for higher CLB levels, gain another year of skilled work experience, complete a higher credential, add French as a second language, or get a provincial nomination (+600 points). The calculator lets you try what-if scenarios to see each impact.',
  },
  {
    q: 'Does the app work offline?',
    a: 'Yes. The calculator works fully offline, and the latest fetched draw history is cached on your device. You only need a connection to refresh draws or receive notifications.',
  },
  {
    q: 'Is CRS Pulse free?',
    a: 'Completely free — no ads, no trackers, no paywalls. It is an independent tool and is not affiliated with IRCC or the Government of Canada.',
  },
];

export default function FaqScreen() {
  const c = useColors();
  const accent = useAccentColor();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [open, setOpen] = useState<number | null>(0);

  return (
    <View style={[s.wrap, { backgroundColor: c.surfacePrimary }]}>
      <View style={[s.topBar, { paddingTop: insets.top + spacing.sm, borderBottomColor: c.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={16} style={s.backBtn}>
          <Ionicons name="chevron-back" size={22} color={c.textPrimary} />
          <Text style={[s.backLabel, { color: c.textPrimary }]}>Back</Text>
        </TouchableOpacity>
        <Text style={[s.title, { color: c.textPrimary }]}>FAQ</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        contentContainerStyle={[s.body, { paddingBottom: insets.bottom + spacing['2xl'] }]}
        showsVerticalScrollIndicator={false}
      >
        {FAQ_ITEMS.map((item, i) => {
          const expanded = open === i;
          return (
            <View
              key={item.q}
              style={[s.card, { borderColor: c.border, backgroundColor: c.surfaceCard }]}
            >
              <TouchableOpacity
                style={s.qRow}
                onPress={() => setOpen(expanded ? null : i)}
                activeOpacity={0.55}
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
  topBar:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
               paddingHorizontal: spacing.base, paddingBottom: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn:   { flexDirection: 'row', alignItems: 'center', gap: 2, width: 60 },
  backLabel: { fontSize: typography.base, fontWeight: typography.medium },
  title:     { fontSize: typography.base, fontWeight: typography.semibold, flex: 1, textAlign: 'center' },
  body:      { padding: spacing.base, paddingTop: spacing.lg, gap: spacing.sm },
  card:      { borderWidth: StyleSheet.hairlineWidth, borderRadius: borderRadius.md,
               paddingHorizontal: spacing.md },
  qRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
               gap: spacing.sm, paddingVertical: spacing.md },
  qText:     { flex: 1, fontSize: typography.base, fontWeight: typography.semibold },
  aText:     { fontSize: typography.base, lineHeight: 24, paddingBottom: spacing.md },
});
