import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/types';
import { useProfileStore } from '@/store/profileStore';
import type { ThemeMode } from '@/store/profileStore';
import { resetAllData } from '@/utils/resetAllData';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { SkeletonCard } from '@/components/common/SkeletonCard';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { palette, spacing, typography, borderRadius } from '@/theme';
import { useColors } from '@/hooks/useColors';
import { useAccentColor } from '@/hooks/useAccentColor';
import {
  calculateCRS,
  suggestCategory,
  type TefScale,
} from '@/features/onboarding/utils/crsCalculator';
import { buildCRSInput } from '@/features/onboarding/utils/buildCRSInput';
import { isCrsScoreReady } from '@/utils/crsScoreReady';
import { exportProfilePdf } from '@/utils/exportProfile';
import type { Colors } from '@/theme/colors';
import type { CalcInputs } from '@/store/profileStore';
import { AppHeader } from '@/components/layout/AppHeader';

// ─── Helpers ────────────────────────────────────────────────────────────────
const EDU_LABELS: Record<string, string> = {
  less_than_secondary: 'Less than high school',
  secondary:           'High school diploma',
  '1year':             '1-year post-secondary',
  '2year':             '2-year post-secondary',
  bachelors:           "Bachelor's degree",
  two_or_more:         'Two or more degrees',
  masters:             "Master's degree",
  phd:                 'PhD / Doctorate',
};

const MARITAL_LABELS: Record<string, string> = {
  single:                   'Single',
  married:                  'Married / CLP',
  married_not_accompanying: 'Married (not accompanying)',
};

function workExpLabel(years: number): string {
  if (years === 0) return 'None';
  if (years === 1) return '1 year';
  return `${years}+ years`;
}

function jobOfferLabel(j: string): string {
  if (j === 'noc_00') return 'NOC TEER 0 Major Group 00';
  if (j === 'noc_a')  return 'NOC TEER 1/2/3';
  return 'None';
}

// ─── Styles ──────────────────────────────────────────────────────────────────
function makeStyles(c: Colors, accent: string) {
  return StyleSheet.create({
    safe:         { flex: 1, backgroundColor: c.surfacePrimary },
    headerWrap:   { paddingHorizontal: spacing.base, paddingTop: spacing.base, paddingBottom: spacing.md, gap: spacing.xs },
    greeting:     { color: c.textMuted, fontSize: typography.sm, fontWeight: typography.medium, letterSpacing: 0.5, textTransform: 'uppercase' },
    title:        { color: c.textPrimary, fontSize: typography['4xl'], fontWeight: typography.black, letterSpacing: -0.5 },
    skeletons:    { padding: spacing.base, gap: spacing.sm },

    section:      { gap: spacing.sm, marginBottom: spacing.sm, borderRadius: borderRadius.md },
    sectionTitle: { color: c.textPrimary, fontSize: typography.base, fontWeight: typography.bold, letterSpacing: 0.1, marginBottom: spacing.xs },
    hint:         { color: c.textSecondary, fontSize: typography.sm, lineHeight: 20 },

    // Score hero
    scoreHero:  { alignItems: 'center', paddingVertical: spacing.md, gap: spacing.xs },
    scoreNum:   { fontSize: 60, fontWeight: typography.black, letterSpacing: -2, lineHeight: 68 },
    scoreLabel: { color: c.textMuted, fontSize: typography.xs, fontWeight: typography.semibold, letterSpacing: 0.8, textTransform: 'uppercase' },
    catBadge: {
      paddingHorizontal: spacing.md,
      paddingVertical:   spacing.xs,
      borderRadius:      borderRadius.md,
      borderWidth:       0.3,
      borderColor:       c.border,
      backgroundColor:   c.surfaceSecondary,
    },
    catText: { fontSize: typography.sm, fontWeight: typography.bold },

    divider: { height: 1, backgroundColor: c.border, marginVertical: spacing.xs },

    // Profile info rows
    groupTitle: { color: c.textMuted, fontSize: typography.xs, fontWeight: typography.bold, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: spacing.xs },
    row:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.xs + 2 },
    rowDivider: { height: 1, backgroundColor: c.border },
    rowLabel:   { color: c.textMuted, fontSize: typography.sm, fontWeight: typography.medium },
    rowValue:   { color: c.textPrimary, fontSize: typography.sm, fontWeight: typography.semibold, flexShrink: 1, textAlign: 'right', marginLeft: spacing.sm },

    // Score breakdown
    breakdownGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    breakdownItem: {
      flex: 1,
      minWidth: '45%',
      backgroundColor: c.surfaceSecondary,
      borderRadius:    borderRadius.md,
      borderWidth:     0.3,
      borderColor:     c.border,
      padding:         spacing.sm,
      gap:             2,
    },
    bLabel: { color: c.textMuted, fontSize: typography.xs, fontWeight: typography.semibold, letterSpacing: 0.4, textTransform: 'uppercase' },
    bValue: { color: c.textPrimary, fontSize: typography.xl, fontWeight: typography.black },

    // Notification row
    notifRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.base },
    notifText:  { flex: 1, gap: 2 },
    notifLabel: { color: c.textPrimary, fontSize: typography.base, fontWeight: typography.semibold },

    // Appearance
    themeRow:   { flexDirection: 'row', gap: spacing.xs },
    themeBtn: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: spacing.xs, paddingVertical: spacing.sm,
      borderRadius: borderRadius.md, borderWidth: 0.3,
      borderColor: c.border, backgroundColor: c.surfaceSecondary,
    },
    themeBtnActive: { borderColor: accent, backgroundColor: accent + '18' },
    themeBtnText:   { color: c.textSecondary, fontSize: typography.sm, fontWeight: typography.semibold },
    themeBtnTextActive: { color: c.textPrimary },

    // Export & Share
    exportRow:     { flexDirection: 'row', gap: spacing.sm },
    exportBtn: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: spacing.xs, paddingVertical: spacing.sm + 2,
      borderRadius: borderRadius.md, borderWidth: 0.5,
    },
    exportBtnText: { fontSize: typography.sm, fontWeight: typography.semibold },

    // Danger zone
    dangerTitle: { color: palette.danger, fontSize: typography.xs, fontWeight: typography.bold, letterSpacing: 0.8, textTransform: 'uppercase' },
  });
}

// ─── Constants ───────────────────────────────────────────────────────────────
const THEME_OPTIONS: { label: string; value: ThemeMode; icon: string }[] = [
  { label: 'System', value: 'system', icon: 'phone-portrait-outline' },
  { label: 'Light',  value: 'light',  icon: 'sunny-outline'          },
  { label: 'Dark',   value: 'dark',   icon: 'moon-outline'           },
];


export default function ProfileScreen() {
  const colors  = useColors();
  const accent  = useAccentColor();
  const styles  = makeStyles(colors, accent);
  const { profile, save } = useProfileStore();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [exporting,  setExporting]  = useState(false);

  if (!profile) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.headerWrap}>
          <AppHeader title="Profile" />
        </View>
        <View style={styles.skeletons}><SkeletonCard /><SkeletonCard /></View>
      </SafeAreaView>
    );
  }

  const inp = profile.calculatorInputs;
  const n   = (v: unknown) => Number(v) || 0;
  const coerced: CalcInputs = {
    ...inp,
    firstLangSpeaking:  n(inp.firstLangSpeaking),
    firstLangListening: n(inp.firstLangListening),
    firstLangReading:   n(inp.firstLangReading),
    firstLangWriting:   n(inp.firstLangWriting),
    secondLangSpeaking:  n(inp.secondLangSpeaking),
    secondLangListening: n(inp.secondLangListening),
    secondLangReading:   n(inp.secondLangReading),
    secondLangWriting:   n(inp.secondLangWriting),
    spouseLangSpeaking:  n(inp.spouseLangSpeaking),
    spouseLangListening: n(inp.spouseLangListening),
    spouseLangReading:   n(inp.spouseLangReading),
    spouseLangWriting:   n(inp.spouseLangWriting),
  };

  const crsInput = buildCRSInput(coerced);
  const result   = calculateCRS(crsInput);

  const scoreReady = isCrsScoreReady(
    inp.firstLangTest,
    {
      speaking: coerced.firstLangSpeaking,
      listening: coerced.firstLangListening,
      reading: coerced.firstLangReading,
      writing: coerced.firstLangWriting,
    },
    (inp.tefScale ?? 'current') as TefScale,
  );

  const score = scoreReady ? result.total : 0;

  const cat = scoreReady
    ? (suggestCategory(crsInput, result.firstLangClb) as string)
    : null;

  const scoreColor =
    !scoreReady ? colors.textMuted :
    score >= 490 ? palette.success :
    score >= 450 ? palette.warning :
    palette.danger;

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      const shared = await exportProfilePdf(coerced, result, score, scoreReady ? cat : null, accent);
      if (!shared) {
        Alert.alert('Sharing unavailable', 'This device cannot share files. Your PDF could not be exported.');
      }
    } catch {
      Alert.alert('Export failed', 'Could not generate PDF. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const infoGroups = [
    {
      title: 'Personal',
      rows: [
        { label: 'Age',           value: String(inp.age) },
        { label: 'Marital Status',value: MARITAL_LABELS[inp.maritalStatus] ?? inp.maritalStatus },
      ],
    },
    {
      title: 'Education',
      rows: [
        { label: 'Highest Level',      value: EDU_LABELS[inp.education] ?? inp.education },
        { label: 'Canadian Education', value: inp.canadianEducation === 'none' ? 'None' : inp.canadianEducation === '1_2year' ? '1–2 yr program' : '3+ yr program' },
      ],
    },
    {
      title: 'Language',
      rows: [
        { label: 'First Test',    value: inp.firstLangTest },
        { label: 'Second Test',   value: inp.hasSecondLang ? inp.secondLangTest : 'None' },
      ],
    },
    {
      title: 'Work Experience',
      rows: [
        { label: 'Canadian',          value: workExpLabel(inp.canadianWorkExp) },
        { label: 'Foreign',           value: workExpLabel(inp.foreignWorkExp) },
        { label: 'Trade Certificate', value: inp.hasTradeCert ? 'Yes' : 'No' },
      ],
    },
    {
      title: 'Additional',
      rows: [
        { label: 'Provincial Nom.', value: inp.hasProvincialNomination ? 'Yes ✓' : 'No' },
        { label: 'Job Offer',       value: jobOfferLabel(inp.jobOffer) },
        { label: 'Sibling in Canada',value: inp.hasSiblingInCanada ? 'Yes' : 'No' },
      ],
    },
  ];

  return (
    <ScreenWrapper scrollable keyboardAvoiding>
      <View style={styles.headerWrap}>
        <AppHeader title="Profile" />
      </View>

      {/* ── CRS Score Hero ── */}
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>CRS Score</Text>
        <View style={styles.scoreHero}>
          <Text style={[styles.scoreNum, { color: scoreColor }]}>
            {scoreReady ? score : '—'}
          </Text>
          <Text style={styles.scoreLabel}>Comprehensive Ranking System</Text>
          {cat && (
            <View style={styles.catBadge}>
              <Text style={[styles.catText, { color: accent }]}>{cat}</Text>
            </View>
          )}
        </View>

        {!scoreReady && (
          <Text style={styles.hint}>
            Enter CLB 4+ scores in all four language skills on the Home tab to see your CRS score.
          </Text>
        )}


      </Card>

      {/* ── Profile Details (grouped) ── */}
      {infoGroups.map((group) => (
        <Card key={group.title} style={styles.section}>
          <Text style={styles.groupTitle}>{group.title}</Text>
          {group.rows.map(({ label, value }) => (
            <View key={label}>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>{label}</Text>
                <Text style={styles.rowValue}>{value}</Text>
              </View>
            </View>
          ))}
        </Card>
      ))}

      {/* ── Profile Report ── */}
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Profile Report</Text>
        <Text style={styles.hint}>
          Download a PDF summary of your CRS score and profile details.
        </Text>
        <View style={styles.exportRow}>
          <TouchableOpacity
            style={[styles.exportBtn, { backgroundColor: accent + '15', borderColor: accent + '50' }]}
            onPress={handleExportPdf}
            disabled={exporting}
            activeOpacity={0.7}
            accessibilityLabel="Export CRS profile as PDF"
          >
            <Ionicons name="document-outline" size={18} color={accent} />
            <Text style={[styles.exportBtnText, { color: accent }]}>
              {exporting ? 'Generating…' : 'Export Profile as PDF'}
            </Text>
          </TouchableOpacity>
        </View>
      </Card>

      {/* ── Notifications ── */}
      <Card style={styles.section}>
        <TouchableOpacity
          style={styles.notifRow}
          onPress={() => navigation.navigate('Notifications')}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Open notification settings"
        >
          <View style={styles.notifText}>
            <Text style={styles.notifLabel}>Notifications</Text>
            <Text style={styles.hint}>Manage draw alerts and view recent draws</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </Card>

      {/* ── Appearance ── */}
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Appearance</Text>
        <View style={styles.themeRow}>
          {THEME_OPTIONS.map((t) => {
            const selected = (profile.theme ?? 'system') === t.value;
            return (
              <TouchableOpacity
                key={t.value}
                onPress={() => save({ theme: t.value })}
                style={[styles.themeBtn, selected && styles.themeBtnActive]}
              >
                <Ionicons
                  name={t.icon as any}
                  size={15}
                  color={selected ? accent : colors.textSecondary}
                />
                <Text style={[styles.themeBtnText, selected && styles.themeBtnTextActive]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Card>

      {/* ── Danger Zone ── */}
      <Card style={styles.section}>
        <Text style={styles.dangerTitle}>Danger Zone</Text>
        <Button
          title="Reset All Data"
          variant="danger"
          onPress={() => {
            Alert.alert(
              'Reset All Data',
              'This permanently erases your CRS profile, tracked application, timeline milestones, checklist progress, and notification settings on this device. This cannot be undone.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Reset Everything',
                  style: 'destructive',
                  onPress: () => {
                    void resetAllData();
                  },
                },
              ],
            );
          }}
          fullWidth
        />
      </Card>
    </ScreenWrapper>
  );
}
