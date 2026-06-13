import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { STORAGE_KEYS } from '@/constants';
import { palette, spacing, typography, borderRadius } from '@/theme';
import { useColors } from '@/hooks/useColors';
import { useAccentColor } from '@/hooks/useAccentColor';
import { AppHeader } from '@/components/layout/AppHeader';

interface ChecklistSection {
  title: string;
  icon: string;
  items: { id: string; label: string; hint?: string }[];
}

const SECTIONS: ChecklistSection[] = [
  {
    title: 'Identity',
    icon: 'person-outline',
    items: [
      { id: 'passport',     label: 'Valid passport', hint: 'Should not expire within 6 months' },
      { id: 'photo',        label: 'Digital photo',  hint: 'Meets IRCC specifications' },
      { id: 'birth_cert',   label: 'Birth certificate' },
      { id: 'marriage_cert',label: 'Marriage certificate (if married)' },
    ],
  },
  {
    title: 'Language',
    icon: 'language-outline',
    items: [
      { id: 'lang_test',   label: 'Language test results', hint: 'IELTS / CELPIP / PTE Core / TEF / TCF — valid 2 years' },
      { id: 'lang_second', label: 'Second language results (if claiming points)' },
    ],
  },
  {
    title: 'Education',
    icon: 'school-outline',
    items: [
      { id: 'eca',         label: 'Educational Credential Assessment (ECA)', hint: 'WES, IQAS, ICES, etc. — valid 5 years' },
      { id: 'degrees',     label: 'Degrees and diplomas' },
      { id: 'transcripts', label: 'Transcripts' },
    ],
  },
  {
    title: 'Work Experience',
    icon: 'briefcase-outline',
    items: [
      { id: 'ref_letters', label: 'Employment reference letters', hint: 'Duties, hours/week, salary, dates, company letterhead' },
      { id: 'pay_stubs',   label: 'Pay stubs / T4s' },
      { id: 'job_offer',   label: 'Job offer letter (if applicable)' },
    ],
  },
  {
    title: 'Funds & Civil Documents',
    icon: 'wallet-outline',
    items: [
      { id: 'funds',  label: 'Proof of funds', hint: 'Official bank letters — 6-month history' },
      { id: 'police', label: 'Police certificates', hint: 'Every country lived in 6+ months since age 18' },
      { id: 'medical',label: 'Immigration medical exam', hint: 'IRCC-approved panel physician' },
    ],
  },
  {
    title: 'Other',
    icon: 'documents-outline',
    items: [
      { id: 'translations', label: 'Certified translations', hint: 'For any document not in English or French' },
      { id: 'pnp_cert',     label: 'Provincial nomination certificate (if applicable)' },
      { id: 'spouse_docs',  label: "Spouse / partner documents (if accompanying)" },
    ],
  },
];

const TOTAL_ITEMS = SECTIONS.reduce((n, s) => n + s.items.length, 0);

export default function DocumentChecklistScreen() {
  const c = useColors();
  const accent = useAccentColor();
  const insets = useSafeAreaInsets();
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEYS.DOC_CHECKLIST)
      .then((raw) => { if (raw) setChecked(JSON.parse(raw)); })
      .catch(() => {});
  }, []);

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      AsyncStorage.setItem(STORAGE_KEYS.DOC_CHECKLIST, JSON.stringify(next)).catch(() => {});
      return next;
    });
  };

  const doneCount = useMemo(() => Object.values(checked).filter(Boolean).length, [checked]);
  const progress = TOTAL_ITEMS === 0 ? 0 : doneCount / TOTAL_ITEMS;

  return (
    <View style={[s.wrap, { backgroundColor: c.surfacePrimary }]}>
      <AppHeader title="Document Checklist" variant="stack" />

      {/* Progress */}
      <View style={s.progressWrap}>
        <View style={s.progressLabels}>
          <Text style={[s.progressText, { color: c.textSecondary }]}>
            {doneCount} of {TOTAL_ITEMS} documents ready
          </Text>
          <Text style={[s.progressText, { color: doneCount === TOTAL_ITEMS ? palette.success : c.textMuted }]}>
            {Math.round(progress * 100)}%
          </Text>
        </View>
        <View style={[s.progressTrack, { backgroundColor: c.surfaceTertiary }]}>
          <View
            style={[
              s.progressFill,
              { backgroundColor: doneCount === TOTAL_ITEMS ? palette.success : accent, width: `${progress * 100}%` },
            ]}
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[s.body, { paddingBottom: insets.bottom + spacing['2xl'] }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[s.intro, { color: c.textSecondary }]}>
          Standard documents for an Express Entry permanent residence application. Your personalized
          checklist after an ITA is the official list — always follow your IRCC account.
        </Text>

        {SECTIONS.map((section) => {
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
  wrap:      { flex: 1 },
  topBar:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
               paddingHorizontal: spacing.base, paddingBottom: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn:   { flexDirection: 'row', alignItems: 'center', gap: 2, width: 60 },
  backLabel: { fontSize: typography.base, fontWeight: typography.medium },
  title:     { fontSize: typography.base, fontWeight: typography.semibold, flex: 1, textAlign: 'center' },

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
