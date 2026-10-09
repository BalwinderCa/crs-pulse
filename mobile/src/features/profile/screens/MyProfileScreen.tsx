import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useProfileStore } from '@/store/profileStore';
import { Card } from '@/components/common/Card';
import { AppHeader } from '@/components/layout/AppHeader';
import { spacing, typography, borderRadius } from '@/theme';
import { useColors } from '@/hooks/useColors';
import type { Colors } from '@/theme/colors';
import { summarizeProfile } from '../utils/profileSummary';

function makeStyles(c: Colors) {
  return StyleSheet.create({
    wrap:         { flex: 1, backgroundColor: c.surfacePrimary },
    body:         { padding: spacing.base, gap: spacing.sm },
    section:      { gap: spacing.sm, borderRadius: borderRadius.md },
    hint:         { color: c.textSecondary, fontSize: typography.sm, lineHeight: 20 },

    groupTitle: { color: c.textMuted, fontSize: typography.xs, fontWeight: typography.bold, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: spacing.xs },
    row:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.xs + 2 },
    rowLabel:   { color: c.textMuted, fontSize: typography.sm, fontWeight: typography.medium },
    rowValue:   { color: c.textPrimary, fontSize: typography.sm, fontWeight: typography.semibold, flexShrink: 1, textAlign: 'right', marginLeft: spacing.sm },

  });
}

/** The user's saved CRS profile details, reached from Settings → My Profile. */
export default function MyProfileScreen() {
  const colors = useColors();
  const styles = makeStyles(colors);
  const insets = useSafeAreaInsets();
  const profile = useProfileStore((s) => s.profile);
  const { t } = useTranslation();

  const summary = profile ? summarizeProfile(profile.calculatorInputs) : null;

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

  const canEduValue = (v: string) =>
    v === 'none' ? t('profile.eduNone') :
    v === '1_2year' ? t('profile.edu1to2Year') :
    t('profile.edu3PlusYear');

  const inp = profile?.calculatorInputs;
  const infoGroups = inp ? [
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
        { label: t('profile.canadian'),         value: workExpLabel(inp.canadianWorkExp) },
        { label: t('profile.foreign'),          value: workExpLabel(inp.foreignWorkExp) },
        { label: t('profile.tradeCertificate'), value: inp.hasTradeCert ? t('profile.yes') : t('profile.no') },
      ],
    },
    {
      title: t('profile.additional'),
      rows: [
        { label: t('profile.provincialNom'),   value: inp.hasProvincialNomination ? t('profile.yesCheck') : t('profile.no') },
        { label: t('profile.siblingInCanada'), value: inp.hasSiblingInCanada ? t('profile.yes') : t('profile.no') },
      ],
    },
  ] : [];

  return (
    <View style={styles.wrap}>
      <AppHeader title={t('profile.myProfile')} variant="stack" />
      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + spacing['2xl'] }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hidden until the user has entered their profile, so fresh installs don't echo the defaults. */}
        {!summary?.scoreReady ? (
          <Card style={styles.section}>
            <Text style={styles.hint}>{t('profile.enterScoreHint')}</Text>
          </Card>
        ) : (
          infoGroups.map((group) => (
            <Card key={group.title} style={styles.section}>
              <Text style={styles.groupTitle}>{group.title}</Text>
              {group.rows.map(({ label, value }) => (
                <View key={label} style={styles.row}>
                  <Text style={styles.rowLabel}>{label}</Text>
                  <Text style={styles.rowValue}>{value}</Text>
                </View>
              ))}
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
}
