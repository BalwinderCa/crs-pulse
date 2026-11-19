import React, { useState } from 'react';
import { Linking, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from '@/components/common/AppText';
import Toast from 'react-native-toast-message';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
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
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { SkeletonCard } from '@/components/common/SkeletonCard';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { palette, spacing, typography, borderRadius } from '@/theme';
import { useColors } from '@/hooks/useColors';
import { useAccentColor } from '@/hooks/useAccentColor';
import type { Colors } from '@/theme/colors';
import { Toggle } from '@/components/common/Toggle';
import { usePushPrefs, type PushPrefs } from '@/hooks/useDrawNotifications';
import { useTimelineStore } from '@/store/timelineStore';
import { sharedAorMonth } from '@/features/community/model';
import { FONT_OPTIONS, loadAppFont, type AppFont } from '@/theme/fonts';
import { MANAGE_SUBSCRIPTIONS_URL, restorePro, useIsPro, useProStore } from '@/store/proStore';
import { AppHeader } from '@/components/layout/AppHeader';
import { summarizeProfile } from '../utils/profileSummary';

// Accent choices. Each keeps roughly the default red's contrast on both the
// light and dark card surfaces, since the accent is used for text as well as fills.
const ACCENT_OPTIONS: { value: string; labelKey: string }[] = [
  { value: '#DC2626', labelKey: 'profile.colorRed' },
  { value: '#EA580C', labelKey: 'profile.colorOrange' },
  { value: '#A16207', labelKey: 'profile.colorAmber' },
  { value: '#059669', labelKey: 'profile.colorGreen' },
  { value: '#0284C7', labelKey: 'profile.colorSky' },
  { value: '#2563EB', labelKey: 'profile.colorBlue' },
  { value: '#6366F1', labelKey: 'profile.colorIndigo' },
  { value: '#8B5CF6', labelKey: 'profile.colorPurple' },
  { value: '#DB2777', labelKey: 'profile.colorPink' },
];

const ALERTS: { key: keyof PushPrefs; label: string; hint: string; icon: keyof typeof Ionicons.glyphMap; pro?: true }[] = [
  { key: 'draws', label: 'profile.alertDraws', hint: 'profile.alertDrawsHint', icon: 'megaphone-outline' },
  { key: 'times', label: 'profile.alertTimes', hint: 'profile.alertTimesHint', icon: 'time-outline', pro: true },
  { key: 'aor',   label: 'profile.alertAor',   hint: 'profile.alertAorHint', icon: 'people-outline', pro: true },
];

const PRO_POINTS = ['pro.pointAds', 'pro.pointTimes', 'pro.pointAor', 'pro.pointLook'] as const;

/** Small "PRO" tag next to a locked feature. */
function ProBadge({ accent, label }: { accent: string; label: string }) {
  return (
    <View style={{ backgroundColor: accent, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 }}>
      <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.6 }}>{label}</Text>
    </View>
  );
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
    scoreRow:   { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    scoreRight: { alignItems: 'flex-end', gap: 4 },
    scoreNum:   { fontSize: 30, fontWeight: typography.black, letterSpacing: -0.5, lineHeight: 34 },
    scoreLabel: { color: c.textMuted, fontSize: typography.xs, marginTop: 2 },
    catBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical:   2,
      borderRadius:      borderRadius.md,
      borderWidth:       0.3,
      borderColor:       c.border,
      backgroundColor:   c.surfaceSecondary,
    },
    catText: { fontSize: typography.xs, fontWeight: typography.bold },

    // Notification row
    notifRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.base },
    notifText:  { flex: 1, gap: 2 },
    alertIcon:  { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
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
    fontRow:    { gap: spacing.xs },
    fontBtn:    { flex: 0, paddingHorizontal: spacing.md },
    subTitle:   { color: c.textMuted, fontSize: typography.xs, fontWeight: typography.bold, letterSpacing: 0.8, textTransform: 'uppercase', marginTop: spacing.sm },
    groupHead:  { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm, marginBottom: spacing.xs, paddingHorizontal: spacing.xs },
    groupLabelInline: { marginTop: 0, marginBottom: 0, paddingHorizontal: 0 },
    locked:     { opacity: 0.45 },
    labelRow:   { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    proCard:    { padding: spacing.base, borderRadius: borderRadius.lg, borderWidth: 1, marginBottom: spacing.sm, gap: spacing.md },
    proHead:    { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    proTitle:   { color: c.textPrimary, fontSize: typography.lg, fontWeight: typography.bold },
    proList:    { flexDirection: 'row', flexWrap: 'wrap', rowGap: 6, columnGap: spacing.md },
    proPoint:   { flexDirection: 'row', alignItems: 'center', gap: 6, width: '46%' },
    proPointTxt: { color: c.textPrimary, fontSize: typography.sm, fontWeight: typography.medium, flexShrink: 1 },
    activePill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
    activePillTxt: { color: palette.success, fontSize: 11, fontWeight: '800', letterSpacing: 0.4 },
    proActions: { flexDirection: 'row', gap: spacing.sm },
    proAction:  { flex: 1, alignItems: 'center', borderRadius: borderRadius.md, borderWidth: 1, paddingVertical: 10 },
    proActionTxt: { fontSize: typography.sm, fontWeight: typography.bold },
    proCta:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderRadius: borderRadius.md, paddingVertical: 11 },
    proCtaTxt:  { color: '#fff', fontSize: typography.base, fontWeight: typography.bold },
    groupLabel: { color: c.textMuted, fontSize: typography.xs, fontWeight: typography.bold, letterSpacing: 0.8, textTransform: 'uppercase', marginTop: spacing.sm, marginBottom: spacing.xs, paddingHorizontal: spacing.xs },
    swatchRow:  { flexDirection: 'row' },
    swatchCell: { flex: 1, alignItems: 'center' },
    swatchRing: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
    swatch:     { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },

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
  const [confirmReset, setConfirmReset] = useState(false);

  const THEME_OPTIONS: { label: string; value: ThemeMode; icon: string }[] = [
    { label: t('profile.themeSystem'), value: 'system', icon: 'phone-portrait-outline' },
    { label: t('profile.themeLight'),  value: 'light',  icon: 'sunny-outline'          },
    { label: t('profile.themeDark'),   value: 'dark',   icon: 'moon-outline'           },
  ];

  const LANG_OPTIONS: { label: string; value: AppLanguage; icon: string }[] = [
    { label: t('profile.english'), value: 'en', icon: 'language-outline' },
    { label: t('profile.french'),  value: 'fr', icon: 'chatbubble-outline' },
  ];

  const isPro = useIsPro();
  const proPaid = useProStore((st) => st.active);
  const proTrialEnds = useProStore((st) => st.trialEnds);
  const { productId: proProduct, expires: proExpires, willRenew: proRenews } = useProStore();
  const [restoring, setRestoring] = useState(false);
  const restore = async () => {
    setRestoring(true);
    const r = await restorePro();
    setRestoring(false);
    Toast.show(r === 'restored' ? { type: 'success', text1: t('pro.restored') }
      : r === 'none' ? { type: 'info', text1: t('pro.nothingToRestore') }
      : { type: 'error', text1: t('pro.restoreFailed') });
  };
  const proDate = proExpires ? new Date(proExpires).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric', year: 'numeric' }) : null;
  const proPlanLine = [
    proProduct ? t(proProduct.includes('year') ? 'pro.yearlyPlan' : 'pro.monthlyPlan') : null,
    proDate ? t(proRenews ? 'pro.renewsOn' : 'pro.endsOn', { date: proDate }) : null,
  ].filter(Boolean).join(' · ');
  const proTrialDays = !proPaid && proTrialEnds ? Math.max(0, Math.ceil((proTrialEnds - Date.now()) / 86_400_000)) : 0;
  const goPro = () => navigation.navigate('Pro');
  const pushPrefs = usePushPrefs((st) => st.prefs);
  const setPush = usePushPrefs((st) => st.set);
  const aorMonth = sharedAorMonth(useTimelineStore((st) => st.milestones));

  const handleFontChange = async (font: AppFont) => {
    // Only switch once the files are in; on failure the current font stays.
    if (await loadAppFont(font)) await save({ font });
  };

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

  const { scoreReady, score, cat } = summarizeProfile(profile.calculatorInputs);

  const scoreColor =
    !scoreReady ? colors.textMuted :
    score >= 490 ? palette.success :
    score >= 450 ? palette.warning :
    palette.danger;

  return (
    <ScreenWrapper scrollable keyboardAvoiding header={<AppHeader title={t('profile.title')} />}>
      {/* ── Pro ── */}
      {!proPaid && (
        <TouchableOpacity ph-label="profile-go-pro" onPress={goPro} activeOpacity={0.85} accessibilityRole="button"
          accessibilityLabel={`${t('pro.goPro')}. ${t('pro.goProSub')}`}
          style={[styles.proCard, { backgroundColor: accent + '10', borderColor: accent + '55' }]}>
          <View style={styles.proHead}>
            <View style={[styles.alertIcon, { backgroundColor: accent }]}>
              <MaterialCommunityIcons name="crown" size={20} color="#fff" />
            </View>
            <View style={styles.notifText}>
              <Text style={styles.proTitle}>{t('pro.goPro')}</Text>
              <Text style={styles.hint}>
                {proTrialDays > 0 ? t('pro.statusTrial', { count: proTrialDays }) : t('pro.goProSub')}
              </Text>
            </View>
          </View>
          <View style={styles.proList}>
            {PRO_POINTS.map((k) => (
              <View key={k} style={styles.proPoint}>
                <Ionicons name="checkmark-circle" size={16} color={accent} />
                <Text style={styles.proPointTxt}>{t(k)}</Text>
              </View>
            ))}
          </View>
          <View style={[styles.proCta, { backgroundColor: accent }]}>
            <Text style={styles.proCtaTxt}>{t('pro.ctaShort')}</Text>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </View>
        </TouchableOpacity>
      )}

      {proPaid && (
        <View style={[styles.proCard, { backgroundColor: accent + '10', borderColor: accent + '55' }]}>
          <View style={styles.proHead}>
            <View style={[styles.alertIcon, { backgroundColor: accent }]}>
              <MaterialCommunityIcons name="crown" size={20} color="#fff" />
            </View>
            <View style={styles.notifText}>
              <Text style={styles.proTitle}>{t('pro.activeHeadline')}</Text>
              <Text style={styles.hint}>{proPlanLine}</Text>
            </View>
            <View style={[styles.activePill, { backgroundColor: palette.success + '22' }]}>
              <Text style={styles.activePillTxt}>{t('pro.active')}</Text>
            </View>
          </View>
          <View style={styles.proActions}>
            <TouchableOpacity ph-label="profile-pro-manage" onPress={() => { void Linking.openURL(MANAGE_SUBSCRIPTIONS_URL); }}
              style={[styles.proAction, { borderColor: accent }]} accessibilityRole="button">
              <Text style={[styles.proActionTxt, { color: accent }]}>{t('pro.manage')}</Text>
            </TouchableOpacity>
            <TouchableOpacity ph-label="profile-pro-restore" onPress={() => { void restore(); }} disabled={restoring}
              style={[styles.proAction, { borderColor: colors.border }]} accessibilityRole="button">
              <Text style={[styles.proActionTxt, { color: colors.textSecondary }]}>{t('pro.restore')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── CRS Score (compact) ── */}
      <Card style={styles.section}>
        <View style={styles.scoreRow}>
          <View style={styles.notifText}>
            <Text style={styles.notifLabel}>{t('profile.crsScore')}</Text>
            <Text style={styles.scoreLabel}>{t('profile.comprehensiveRanking')}</Text>
          </View>
          <View style={styles.scoreRight}>
            <Text style={[styles.scoreNum, { color: scoreColor }]}>{scoreReady ? score : '—'}</Text>
            {cat && (
              <View style={styles.catBadge}>
                <Text style={[styles.catText, { color: accent }]}>{cat}</Text>
              </View>
            )}
          </View>
        </View>
        {!scoreReady && <Text style={styles.hint}>{t('profile.enterScoreHint')}</Text>}
      </Card>

      {/* ── My Profile (details live on their own screen) ── */}
      <Card style={styles.section}>
        <TouchableOpacity ph-label="profile-my-profile"
          style={styles.notifRow}
          onPress={() => navigation.navigate('MyProfile')}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('profile.myProfile')}
        >
          <View style={styles.notifText}>
            <Text style={styles.notifLabel}>{t('profile.myProfile')}</Text>
            <Text style={styles.hint}>{t('profile.myProfileHint')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </Card>

      {/* ── Notifications ── */}
      <Text style={styles.groupLabel}>{t('profile.notifications')}</Text>
      <Card style={styles.section}>
        {ALERTS.map((a) => {
          // Locked Pro alerts are dimmed (the PRO tag stays bright) and open the paywall.
          const dim = a.pro && !isPro ? styles.locked : null;
          return (
          <View key={a.key} style={styles.notifRow}>
            <View style={[styles.alertIcon, { backgroundColor: accent + '18' }, dim]}>
              <Ionicons name={a.icon} size={18} color={accent} />
            </View>
            <View style={styles.notifText}>
              <View style={styles.labelRow}>
                <Text style={[styles.notifLabel, dim]}>{t(a.label)}</Text>
                {a.pro && !isPro && <ProBadge accent={accent} label={t('pro.proBadge')} />}
              </View>
              <Text style={[styles.hint, dim]}>
                {a.key === 'aor' && pushPrefs.aor && !aorMonth ? t('profile.alertAorMissing') : t(a.hint)}
              </Text>
            </View>
            {/* Pro alerts stay off (and open Pro) without Pro; the saved choice is kept. */}
            <View style={dim}>
            <Toggle
              value={a.pro && !isPro ? false : pushPrefs[a.key]}
              onValueChange={a.pro && !isPro ? goPro : () => { void setPush({ [a.key]: !pushPrefs[a.key] }); }}
              activeColor={accent}
              accessibilityLabel={t(a.label)}
            />
            </View>
          </View>
          );
        })}
      </Card>

      {/* ── Appearance ── */}
      <View style={styles.groupHead}>
        <Text style={[styles.groupLabel, styles.groupLabelInline]}>{t('profile.appearance')}</Text>
        {!isPro && <ProBadge accent={accent} label={t('pro.proBadge')} />}
      </View>
      <Card style={[styles.section, !isPro && styles.locked]}>
        <Text style={styles.sectionTitle}>{t('profile.themeTitle')}</Text>
        <View style={styles.themeRow}>
          {THEME_OPTIONS.map((opt) => {
            const selected = (isPro ? profile.theme ?? 'system' : 'system') === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                onPress={isPro ? () => save({ theme: opt.value }) : goPro}
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

        <Text style={styles.subTitle}>{t('profile.themeFont')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.fontRow}>
          {FONT_OPTIONS.map((opt) => {
            const selected = (isPro ? profile.font ?? 'system' : 'system') === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                ph-label={`profile-font-${opt.value}`}
                onPress={isPro ? () => { void handleFontChange(opt.value); } : goPro}
                style={[styles.themeBtn, styles.fontBtn, selected && styles.themeBtnActive]}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={opt.value === 'system' ? t('profile.themeSystem') : opt.label}
              >
                <Text style={[styles.themeBtnText, selected && styles.themeBtnTextActive]}>
                  {opt.value === 'system' ? t('profile.themeSystem') : opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Text style={styles.subTitle}>{t('profile.themeColor')}</Text>
        <View style={styles.swatchRow}>
          {ACCENT_OPTIONS.map((opt) => {
            const selected = accent.toUpperCase() === opt.value;
            return (
              <View key={opt.value} style={styles.swatchCell}>
                <TouchableOpacity
                  ph-label={`profile-accent-${opt.labelKey.replace('profile.color', '').toLowerCase()}`}
                  onPress={isPro ? () => save({ accent_color: opt.value }) : goPro}
                  style={[styles.swatchRing, selected && { borderColor: opt.value }]}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={t(opt.labelKey)}
                >
                  <View style={[styles.swatch, { backgroundColor: opt.value }]}>
                    {selected && <Ionicons name="checkmark" size={13} color="#fff" />}
                  </View>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </Card>

      {/* ── Language ── */}
      <Text style={styles.groupLabel}>{t('profile.appLanguage')}</Text>
      <Card style={styles.section}>
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
        <Button ph-label="profile-reset-data"
          title={t('profile.resetAllData')}
          variant="danger"
          onPress={() => setConfirmReset(true)}
          fullWidth
        />
      </Card>

      <ConfirmDialog
        visible={confirmReset}
        destructive
        phLabel="profile-reset"
        title={t('profile.resetTitle')}
        message={t('profile.resetMsg')}
        confirmLabel={t('profile.resetEverything')}
        cancelLabel={t('profile.cancel')}
        onCancel={() => setConfirmReset(false)}
        onConfirm={async () => {
          const ok = await resetAllData().then(() => true, () => false);
          // Close first: the toast is drawn under the dialog's modal window.
          setConfirmReset(false);
          if (ok) {
            Toast.show({ type: 'success', text1: t('profile.resetSuccess') });
          } else {
            Toast.show({ type: 'error', text1: t('profile.resetFailed'), text2: t('profile.resetFailedMsg') });
          }
        }}
      />
    </ScreenWrapper>
  );
}
