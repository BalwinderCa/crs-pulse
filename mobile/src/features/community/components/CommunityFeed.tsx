import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { spacing, typography, borderRadius } from '@/theme';
import { useColors } from '@/hooks/useColors';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useApplicationStore } from '@/store/applicationStore';
import { MILESTONE_META } from '@/features/timeline/milestoneMeta';
import type { RootStackParamList } from '@/types';
import { PROGRAMS, programFromTypeId, type ProgramId } from '../model';
import { MY_TIMELINE_ID, useCommunity } from '../useCommunity';
import { CommunityRow, useProgramLabel } from './TimelineCards';
import { ShareTimelineModal } from './ShareTimelineModal';

/**
 * The Community list: program filter, the user's own row (share or edit),
 * then one plain row per shared timeline. Tapping a row opens its page.
 */
export function CommunityFeed() {
  const c = useColors();
  const accent = useAccentColor();
  const { t } = useTranslation();
  const programLabel = useProgramLabel();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const typeId = useApplicationStore((st) => st.application?.typeId);
  const { mine, mySteps, others, settings } = useCommunity();
  const [filter, setFilter] = useState<ProgramId | 'all'>('all');
  const [sharing, setSharing] = useState(false);

  useEffect(() => { if (settings) setFilter((f) => (f === 'all' ? settings.program : f)); }, [settings]);

  const open = (id: string) => navigation.navigate('CommunityTimeline', { id });
  const programs = PROGRAMS.filter((p) => others.some((o) => o.program === p.id));
  const shown = others.filter((o) => filter === 'all' || o.program === filter);
  const count = shown.length + (mine && (filter === 'all' || mine.program === filter) ? 1 : 0);

  // The user's own row.
  const myNow = mySteps[mySteps.length - 1];
  const myProgram = settings?.program ?? programFromTypeId(typeId);
  const myTitle = myNow ? t(MILESTONE_META[myNow.type].labelKey) : t('community.yourTimeline');
  const mySub = !myNow
    ? t('community.addMilestonesFirst')
    : `${programLabel(myProgram)} · ${mine ? t('community.sharedAs', { name: mine.alias || t('community.anonymous') }) : t('community.notShared')}`;

  return (
    <View style={s.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
        {(['all', ...programs.map((p) => p.id)] as (ProgramId | 'all')[]).map((id) => {
          const on = filter === id;
          return (
            <TouchableOpacity key={id} ph-label={`community-filter-${id}`} onPress={() => setFilter(id)}
              accessibilityRole="button" accessibilityState={{ selected: on }}
              style={[s.chip, on ? { backgroundColor: c.textPrimary, borderColor: c.textPrimary } : { borderColor: c.border }]}>
              <Text style={[s.chipTxt, { color: on ? c.surfacePrimary : c.textSecondary }]}>
                {id === 'all' ? t('community.filterAll') : programLabel(id)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <TouchableOpacity
        ph-label="community-my-row"
        activeOpacity={0.7}
        onPress={() => (mine ? open(MY_TIMELINE_ID) : setSharing(true))}
        style={[s.me, { borderColor: c.border }]}
        accessibilityRole="button"
      >
        <View style={[s.youDot, { backgroundColor: accent }]}>
          <Text style={s.youDotTxt}>{t('community.youShort')}</Text>
        </View>
        <View style={s.flex}>
          <Text style={[s.rowTitle, { color: c.textPrimary }]} numberOfLines={1}>{myTitle}</Text>
          <Text style={[s.rowSub, { color: c.textMuted }]} numberOfLines={1}>{mySub}</Text>
        </View>
        <Text style={[s.link, { color: accent }]}>{mine ? t('community.edit') : t('community.share')}</Text>
      </TouchableOpacity>

      <Text style={[s.caption, { color: c.textMuted }]}>{t('community.peopleSharing', { count })}</Text>

      {shown.length === 0 ? (
        <Text style={[s.empty, { color: c.textMuted }]}>{t('community.empty')}</Text>
      ) : (
        shown.map((tl) => <CommunityRow key={tl.id} timeline={tl} onPress={() => open(tl.id)} />)
      )}

      <ShareTimelineModal visible={sharing} onClose={() => setSharing(false)} />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { paddingTop: spacing.sm },
  flex: { flex: 1, minWidth: 0 },
  chips: { gap: spacing.sm, paddingVertical: spacing.xs },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: borderRadius.full, borderWidth: 1 },
  chipTxt: { fontSize: typography.sm, fontWeight: typography.semibold },
  me: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 14, marginTop: spacing.md,
        borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth },
  youDot: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  youDotTxt: { color: '#FFFFFF', fontSize: typography.xs, fontWeight: typography.bold },
  link: { fontSize: typography.sm, fontWeight: typography.semibold },
  caption: { fontSize: typography.xs, fontWeight: typography.semibold, letterSpacing: 0.6, textTransform: 'uppercase',
             marginTop: spacing.lg, marginBottom: spacing.xs },
  rowTitle: { fontSize: typography.base, fontWeight: typography.semibold },
  rowSub: { fontSize: typography.sm, marginTop: 3 },
  empty: { fontSize: typography.sm, textAlign: 'center', paddingVertical: spacing.lg },
});
