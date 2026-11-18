import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { spacing, typography, borderRadius } from '@/theme';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useColors } from '@/hooks/useColors';
import { useApplicationStore } from '@/store/applicationStore';
import { MILESTONE_META } from '@/features/timeline/milestoneMeta';
import type { RootStackParamList } from '@/types';
import { programFromTypeId } from '../model';
import { MY_TIMELINE_ID, useCommunity } from '../useCommunity';
import { useProgramLabel } from './TimelineCards';
import { ShareTimelineModal } from './ShareTimelineModal';
import { BuddyAvatar, isBuddyId } from './BuddyAvatar';

/**
 * The user's own accent "You" card: current step and day, with Share, or once
 * shared, Edit sharing and Preview (your timeline as others see it). Shown at
 * the top of Timeline → My timeline.
 */
export function MyShareCard() {
  const accent = useAccentColor();
  const c = useColors();
  const { t } = useTranslation();
  const programLabel = useProgramLabel();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const typeId = useApplicationStore((st) => st.application?.typeId);
  const { mine, mySteps, settings } = useCommunity();
  const [sharing, setSharing] = useState(false);

  const myNow = mySteps[mySteps.length - 1];
  const myProgram = settings?.program ?? programFromTypeId(typeId);
  const myTitle = myNow
    ? `${t(MILESTONE_META[myNow.type].labelKey)} · ${t('community.dayN', { n: myNow.day })}`
    : t('community.yourTimeline');
  const mySub = !myNow
    ? t('community.addMilestonesFirst')
    : mine
      ? t('community.sharedAsCap', { name: mine.alias || t('community.anonymous') })
      : `${programLabel(myProgram)} · ${t('community.notShared')}`;

  return (
    <>
      <View style={[s.me, { backgroundColor: accent + '12', borderColor: accent + '33' }]}>
        <View style={s.top}>
          {isBuddyId(settings?.avatar) ? (
            <BuddyAvatar id={settings.avatar} size={40} />
          ) : (
            <View style={[s.youDot, { backgroundColor: accent + '22' }]}>
              <Text style={[s.youTxt, { color: accent }]}>{t('community.youShort')}</Text>
            </View>
          )}
          <View style={s.flex}>
            <Text style={[s.meTitle, { color: c.textPrimary }]} numberOfLines={1}>{myTitle}</Text>
            <Text style={[s.meSub, { color: c.textSecondary }]} numberOfLines={1}>{mySub}</Text>
          </View>
        </View>
        {mine ? (
          <View style={s.btns}>
            <TouchableOpacity ph-label="community-my-edit" onPress={() => setSharing(true)}
              style={[s.meBtn, s.flex, { backgroundColor: accent }]} accessibilityRole="button">
              <Ionicons name="create-outline" size={16} color="#FFFFFF" />
              <Text style={s.meBtnTxt}>{t('community.editSharing')}</Text>
            </TouchableOpacity>
            <TouchableOpacity ph-label="community-my-preview" onPress={() => navigation.navigate('CommunityTimeline', { id: MY_TIMELINE_ID, from: 'mine' })}
              style={[s.meBtn, s.flex, s.outline, { borderColor: accent, backgroundColor: c.surfaceCard }]} accessibilityRole="button"
              accessibilityHint={t('community.previewHint')}>
              <Ionicons name="eye-outline" size={16} color={accent} />
              <Text style={[s.meBtnTxt, { color: accent }]}>{t('community.preview')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity ph-label="community-my-row" onPress={() => setSharing(true)}
            style={[s.meBtn, { backgroundColor: accent }]} accessibilityRole="button">
            <Ionicons name="people-outline" size={16} color="#FFFFFF" />
            <Text style={s.meBtnTxt}>{t('community.shareWithCommunity')}</Text>
          </TouchableOpacity>
        )}
      </View>
      <ShareTimelineModal visible={sharing} onClose={() => setSharing(false)} />
    </>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  me: { gap: spacing.md, padding: 14, borderRadius: borderRadius.lg, borderWidth: 1 },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  youDot: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  youTxt: { fontSize: typography.xs, fontWeight: typography.bold },
  meTitle: { fontSize: typography.base, fontWeight: typography.bold },
  meSub: { fontSize: typography.sm, fontWeight: typography.medium, marginTop: 2 },
  meBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: borderRadius.md },
  meBtnTxt: { color: '#FFFFFF', fontSize: typography.sm, fontWeight: typography.bold },
  btns: { flexDirection: 'row', gap: spacing.sm },
  outline: { borderWidth: 1.5 },
});
