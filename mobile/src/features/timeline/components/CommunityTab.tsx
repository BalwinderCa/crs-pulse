import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { palette, spacing, typography, borderRadius } from '@/theme';
import { useColors } from '@/hooks/useColors';
import { useAccentColor } from '@/hooks/useAccentColor';
import { Button } from '@/components/common/Button';
import { STORAGE_KEYS } from '@/constants';
import { track } from '@/services/analyticsService';
import { COMMUNITY_LIVE } from '@/features/community/model';
import { CommunityFeed } from '@/features/community/components/CommunityFeed';

/**
 * Timeline → Community: a waitlist for shared timelines, before building them.
 * "I'm interested" sends one anonymous `community_interest` event per install
 * and remembers the tap on the device. Nothing about the user's own timeline
 * is sent.
 */

// An illustrative timeline (made-up days between steps), shown faded so it
// reads as a preview of what shared timelines could look like.
const PREVIEW: { icon: React.ComponentProps<typeof Ionicons>['name']; color: string; labelKey: string; days: number }[] = [
  { icon: 'mail-open', color: palette.info, labelKey: 'milestoneTypes.ita', days: 0 },
  { icon: 'document-text', color: palette.success, labelKey: 'milestoneTypes.aorReceived', days: 62 },
  { icon: 'finger-print', color: palette.warning, labelKey: 'milestoneTypes.biometricsRequested', days: 64 },
  { icon: 'id-card', color: palette.warning, labelKey: 'milestoneTypes.passportRequested', days: 171 },
];

/**
 * Community tab: the feed once COMMUNITY_LIVE, the waitlist until then.
 * Dev builds show the feed so it can be worked on.
 */
export function CommunityTab() {
  return COMMUNITY_LIVE || __DEV__ ? <CommunityFeed /> : <CommunityWaitlist />;
}

export function CommunityWaitlist() {
  const c = useColors();
  const accent = useAccentColor();
  const { t } = useTranslation();
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEYS.COMMUNITY_INTEREST)
      // Only ever turns it on: a read that lands after a tap must not undo it.
      .then((v) => { if (v) setJoined(true); })
      .catch(() => {});
  }, []);

  const join = () => {
    if (joined) return;
    setJoined(true);
    track('community_interest');
    AsyncStorage.setItem(STORAGE_KEYS.COMMUNITY_INTEREST, new Date().toISOString()).catch(() => {});
  };

  return (
    <View style={s.wrap}>
      <View style={[s.card, { backgroundColor: c.surfaceCard, borderColor: c.border }]}>
        <View style={[s.badge, { backgroundColor: accent + '18' }]}>
          <Text style={[s.badgeTxt, { color: accent }]}>{t('timeline.communitySoon')}</Text>
        </View>
        <View style={[s.icon, { backgroundColor: accent + '18' }]}>
          <Ionicons name="people" size={30} color={accent} />
        </View>
        <Text style={[s.title, { color: c.textPrimary }]}>{t('timeline.communityTitle')}</Text>
        <Text style={[s.body, { color: c.textSecondary }]}>{t('timeline.communityBody')}</Text>

        <View style={[s.preview, { borderColor: c.border }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Text style={[s.previewHead, { color: c.textMuted }]}>{t('timeline.communityPreview')}</Text>
          {PREVIEW.map((p) => (
            <View key={p.labelKey} style={s.previewRow}>
              <View style={[s.previewIcon, { backgroundColor: p.color + '20' }]}>
                <Ionicons name={p.icon} size={14} color={p.color} />
              </View>
              <Text style={[s.previewLabel, { color: c.textSecondary }]}>{t(p.labelKey)}</Text>
              <Text style={[s.previewDays, { color: c.textMuted }]}>
                {p.days === 0 ? t('timeline.communityDay0') : t('timeline.communityDayN', { days: p.days })}
              </Text>
            </View>
          ))}
        </View>

        {joined ? (
          <View style={[s.joined, { backgroundColor: palette.success + '18' }]} accessibilityRole="text">
            <Ionicons name="checkmark-circle" size={18} color={palette.success} />
            <Text style={[s.joinedTxt, { color: c.textPrimary }]}>{t('timeline.communityJoined')}</Text>
          </View>
        ) : (
          <Button
            ph-label="timeline-community-interest"
            title={t('timeline.communityJoin')}
            onPress={join}
            icon={<Ionicons name="sparkles" size={16} color={palette.white} />}
          />
        )}
        <Text style={[s.foot, { color: c.textMuted }]}>{t('timeline.communityFoot')}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { paddingTop: spacing.sm },
  card: { borderRadius: borderRadius.md, borderWidth: 0.3, padding: spacing.lg, gap: spacing.md, alignItems: 'stretch' },
  badge: { alignSelf: 'center', paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: borderRadius.full },
  badgeTxt: { fontSize: typography.xs, fontWeight: typography.bold, letterSpacing: 0.8, textTransform: 'uppercase' },
  icon: { alignSelf: 'center', width: 64, height: 64, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: typography.xl, fontWeight: typography.bold, textAlign: 'center' },
  body: { fontSize: typography.sm, lineHeight: 21, textAlign: 'center' },
  preview: { borderWidth: 1, borderStyle: 'dashed', borderRadius: borderRadius.md, padding: spacing.md, gap: spacing.sm, opacity: 0.75 },
  previewHead: { fontSize: typography.xs, fontWeight: typography.semibold, letterSpacing: 0.8, textTransform: 'uppercase' },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  previewIcon: { width: 26, height: 26, borderRadius: borderRadius.sm, alignItems: 'center', justifyContent: 'center' },
  previewLabel: { flex: 1, fontSize: typography.sm },
  previewDays: { fontSize: typography.xs, fontVariant: ['tabular-nums'] },
  joined: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderRadius: borderRadius.md, paddingVertical: spacing.md },
  joinedTxt: { fontSize: typography.base, fontWeight: typography.semibold },
  foot: { fontSize: typography.xs, lineHeight: 17, textAlign: 'center' },
});
