import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import type { RootStackParamList } from '@/types';
import { useProfileStore } from '@/store/profileStore';
import type { ThemeMode, AppLanguage } from '@/store/profileStore';
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
import { UpgradeBanner } from '@/components/common/UpgradeBanner';
import { AdBanner } from '@/components/common/AdBanner';

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

    // Appearance / Language
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

export default function ProfileScreen() {
  const colors  = useColors();
  const accent  = useAccentColor();
  const styles  = makeStyles(colors, accent);
  const { profile, save } = useProfileStore();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { t } = useTranslation();
  const [exporting,  setExporting]  = useState(false);

  // ── Translation helpers ────────────────────────────────────────────────────
  const EDU_LABELS: Record<string, string> = {
    less_than_secondary: t('profile.eduLessThanSecondary'),
    secondary:           t('profile.eduSecondary'),
    '1year':             t('profile.eduOneYear'),
    '2year':             t('profile.eduTwoYear'),
    bachelors:           t('profile.eduBachelors'),
    two_or_more:         t('profile.eduTwoOrMore'),
    masters:             t('profile.eduMasters'),
    phd:                 t('profile.eduPhd'),
  };

  const MARITAL_LABELS: Record<string, string> = {
    single:                   t('profile.single'),
    married:                  t('profile.married'),
    married_not_accompanying: t('profile.marriedNotAccompanying'),
  };

  function workExpLabel(years: number): string {
    if (years === 0) return t('profile.workNone');
    if (years === 1) return t('profile.workOneYear');
    return t('profile.workYearsPlus', { years });
  }

  const THEME_OPTIONS: { label: string; value: ThemeMode; icon: string }[] = [
    { label: t('profile.themeSystem'), value: 'system', icon: 'phone-portrait-outline' },
    { label: t('profile.themeLight'),  value: 'light',  icon: 'sunny-outline'          },
    { label: t('profile.themeDark'),   value: 'dark',   icon: 'moon-outline'           },
  ];

  const LANG_OPTIONS: { label: string; value: AppLanguage; icon: string }[] = [
    { label: t('profile.english'), value: 'en', icon: 'language-outline' },
    { label: t('profile.french'),  value: 'fr', icon: 'chatbubble-outline' },
  ];

  const handleLanguageChange = async (lang: AppLanguage) => {
    await i18n.changeLanguage(lang);
    await save({ language: lang });
  };

  if (!profile) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.headerWrap}>
          <AppHeader title={t('profile.title')} />
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
        Alert.alert(t('profile.sharingUnavailable'), t('profile.sharingUnavailableMsg'));
      }
    } catch {
      Alert.alert(t('profile.exportFailed'), t('profile.exportFailedMsg'));
    } finally {
      setExporting(false);
    }
  };

  const canEduValue = (v: string) =>
    v === 'none' ? t('profile.eduNone') :
    v === '1_2year' ? t('profile.edu1to2Year') :
    t('profile.edu3PlusYear');

  const infoGroups = [
    {
      title: t('profile.personal'),
      rows: [
        { label: t('profile.age'),           value: String(inp.age) },
        { label: t('profile.maritalStatus'), value: MARITAL_LABELS[inp.maritalStatus] ?? inp.maritalStatus },
      ],
    },
    {
      title: t('profile.education'),
      rows: [
        { label: t('profile.highestLevel'),      value: EDU_LABELS[inp.education] ?? inp.education },
        { label: t('profile.canadianEducation'), value: canEduValue(inp.canadianEducation) },
      ],
    },
    {
      title: t('profile.languageSection'),
      rows: [
        { label: t('profile.firstTest'),  value: inp.firstLangTest },
        { label: t('profile.secondTest'), value: inp.hasSecondLang ? inp.secondLangTest : t('profile.workNone') },
      ],
    },
    {
      title: t('profile.workExperience'),
      rows: [
        { label: t('profile.canadian'),          value: workExpLabel(inp.canadianWorkExp) },
        { label: t('profile.foreign'),           value: workExpLabel(inp.foreignWorkExp) },
        { label: t('profile.tradeCertificate'),  value: inp.hasTradeCert ? t('profile.yes') : t('profile.no') },
      ],
    },
    {
      title: t('profile.additional'),
      rows: [
        { label: t('profile.provincialNom'),    value: inp.hasProvincialNomination ? t('profile.yesCheck') : t('profile.no') },
        { label: t('profile.siblingInCanada'),  value: inp.hasSiblingInCanada ? t('profile.yes') : t('profile.no') },
      ],
    },
  ];

  return (
    <ScreenWrapper scrollable keyboardAvoiding>
      <View style={styles.headerWrap}>
        <AppHeader title={t('profile.title')} />
      </View>

      {/* ── CRS Score Hero ── */}
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>{t('profile.crsScore')}</Text>
        <View style={styles.scoreHero}>
          <Text style={[styles.scoreNum, { color: scoreColor }]}>
            {scoreReady ? score : '—'}
          </Text>
          <Text style={styles.scoreLabel}>{t('profile.comprehensiveRanking')}</Text>
          {cat && (
            <View style={styles.catBadge}>
              <Text style={[styles.catText, { color: accent }]}>{cat}</Text>
            </View>
          )}
        </View>

        {!scoreReady && (
          <Text style={styles.hint}>{t('profile.enterScoreHint')}</Text>
        )}
      </Card>

      <UpgradeBanner />

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
        <Text style={styles.sectionTitle}>{t('profile.profileReport')}</Text>
        <Text style={styles.hint}>{t('profile.downloadPdfHint')}</Text>
        <View style={styles.exportRow}>
          <TouchableOpacity
            style={[styles.exportBtn, { backgroundColor: accent + '15', borderColor: accent + '50' }]}
            onPress={handleExportPdf}
            disabled={exporting}
            activeOpacity={0.7}
            accessibilityLabel={t('profile.exportPdf')}
          >
            <Ionicons name="document-outline" size={18} color={accent} />
            <Text style={[styles.exportBtnText, { color: accent }]}>
              {exporting ? t('profile.generating') : t('profile.exportPdf')}
            </Text>
          </TouchableOpacity>
        </View>
      </Card>

      {/* Single, non-repeating ad — placed low between settings groups so it
          doesn't crowd the score hero or profile details (free users only). */}
      <AdBanner />

      {/* ── Notifications ── */}
      <Card style={styles.section}>
        <TouchableOpacity
          style={styles.notifRow}
          onPress={() => navigation.navigate('Notifications')}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('profile.notifications')}
        >
          <View style={styles.notifText}>
            <Text style={styles.notifLabel}>{t('profile.notifications')}</Text>
            <Text style={styles.hint}>{t('profile.manageNotifs')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </Card>

      {/* ── Appearance ── */}
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>{t('profile.appearance')}</Text>
        <View style={styles.themeRow}>
          {THEME_OPTIONS.map((opt) => {
            const selected = (profile.theme ?? 'system') === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                onPress={() => save({ theme: opt.value })}
                style={[styles.themeBtn, selected && styles.themeBtnActive]}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`${opt.label} theme`}
              >
                <Ionicons
                  name={opt.icon as any}
                  size={15}
                  color={selected ? accent : colors.textSecondary}
                />
                <Text style={[styles.themeBtnText, selected && styles.themeBtnTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Card>

      {/* ── Language ── */}
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>{t('profile.appLanguage')}</Text>
        <View style={styles.themeRow}>
          {LANG_OPTIONS.map((opt) => {
            const selected = (profile.language ?? 'en') === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                onPress={() => { void handleLanguageChange(opt.value); }}
                style={[styles.themeBtn, selected && styles.themeBtnActive]}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={opt.label}
              >
                <Ionicons
                  name={opt.icon as any}
                  size={15}
                  color={selected ? accent : colors.textSecondary}
                />
                <Text style={[styles.themeBtnText, selected && styles.themeBtnTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Card>

      {/* ── Danger Zone ── */}
      <Card style={styles.section}>
        <Text style={styles.dangerTitle}>{t('profile.dangerZone')}</Text>
        <Button
          title={t('profile.resetAllData')}
          variant="danger"
          onPress={() => {
            Alert.alert(
              t('profile.resetTitle'),
              t('profile.resetMsg'),
              [
                { text: t('profile.cancel'), style: 'cancel' },
                {
                  text: t('profile.resetEverything'),
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await resetAllData();
                      Toast.show({ type: 'success', text1: t('profile.resetSuccess') });
                    } catch {
                      Toast.show({ type: 'error', text1: t('profile.resetFailed'), text2: t('profile.resetFailedMsg') });
                    }
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
