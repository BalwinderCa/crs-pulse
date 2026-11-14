import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { MONETIZATION_ENABLED } from '@/constants';
import { Button } from '@/components/common/Button';
import { rewardedAdAvailable, showRewardedAd } from '@/services/adsService';
import { isAdFree, useAdFreeStore } from '@/store/adFreeStore';
import { borderRadius, palette, spacing, typography } from '@/theme';
import { useColors } from '@/hooks/useColors';
import { useAccentColor } from '@/hooks/useAccentColor';

/** "Wed, Nov 18, 6:05 p.m." in the app language. */
function formatUntil(ms: number, lang: string): string {
  return new Date(ms).toLocaleString(lang === 'fr' ? 'fr-CA' : 'en-CA', {
    weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

/**
 * Opt-in rewarded ad: watch one video, every other ad is off for 3 days.
 * AdMob requires the reward to be stated before the ad and declining to cost
 * nothing, so the copy only describes the reward. Hidden when the build has no
 * rewarded unit; while a reward is running it shows the end time instead.
 */
export function AdFreeCard() {
  const { t, i18n } = useTranslation();
  const colors = useColors();
  const accent = useAccentColor();
  const until = useAdFreeStore((s) => s.until);
  const grant = useAdFreeStore((s) => s.grant);
  const [busy, setBusy] = useState(false);
  const active = isAdFree(until);

  if (!MONETIZATION_ENABLED || (!active && !rewardedAdAvailable())) return null;

  const watch = async () => {
    setBusy(true);
    const result = await showRewardedAd();
    setBusy(false);
    if (result === 'earned') {
      const end = await grant();
      Toast.show({ type: 'success', text1: t('profile.adFreeEarned', { date: formatUntil(end, i18n.language) }) });
    } else if (result === 'dismissed') {
      Toast.show({ type: 'info', text1: t('profile.adFreeDismissed') });
    } else {
      Toast.show({ type: 'error', text1: t('profile.adFreeUnavailable') });
    }
  };

  return (
    <View
      style={[s.offer, { backgroundColor: accent + '14', borderColor: accent + '55' }]}
      accessibilityRole="summary"
    >
      <View style={s.head}>
        <View style={[s.iconCircle, { backgroundColor: accent }]}>
          <Ionicons name={active ? 'checkmark' : 'play'} size={22} color={palette.white} />
        </View>
        <View style={s.headText}>
          {!active && (
            <View style={[s.tag, { backgroundColor: accent + '26' }]}>
              <Text style={[s.tagText, { color: accent }]}>{t('profile.adFreeTag')}</Text>
            </View>
          )}
          <Text style={[s.title, { color: colors.textPrimary }]}>
            {active ? t('profile.adFreeActive') : t('profile.adFreeTitle')}
          </Text>
        </View>
      </View>
      <Text style={[s.hint, { color: colors.textSecondary }]}>
        {active
          ? t('profile.adFreeActiveUntil', { date: formatUntil(until!, i18n.language) })
          : t('profile.adFreeOffer')}
      </Text>
      {!active && (
        <>
          <Button ph-label="profile-ad-free-watch"
            title={busy ? t('profile.adFreeLoading') : t('profile.adFreeWatch')}
            variant="primary"
            icon={<Ionicons name="play-circle" size={18} color={palette.white} />}
            loading={busy}
            onPress={() => { void watch(); }}
            fullWidth
          />
          <Text style={[s.note, { color: colors.textMuted }]}>{t('profile.adFreeOptional')}</Text>
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  offer:      { borderWidth: 1, borderRadius: borderRadius.lg, padding: spacing.base, gap: spacing.md, marginBottom: spacing.sm },
  head:       { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  headText:   { flex: 1, gap: 4, alignItems: 'flex-start' },
  tag:        { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.sm },
  tagText:    { fontSize: typography.xs, fontWeight: typography.bold, letterSpacing: 0.8 },
  title:      { fontSize: typography.xl, fontWeight: typography.black, letterSpacing: -0.3 },
  hint:       { fontSize: typography.sm, lineHeight: 20 },
  note:       { fontSize: typography.xs, textAlign: 'center' },
});
