import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator, FlatList, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View,
  type StyleProp, type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format, parseISO, subMonths } from 'date-fns';
import { enUS, fr } from 'date-fns/locale';
import { spacing, typography, borderRadius } from '@/theme';
import { useColors } from '@/hooks/useColors';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useApplicationStore } from '@/store/applicationStore';
import { useTimelineStore } from '@/store/timelineStore';
import type { RootStackParamList } from '@/types';
import { PROGRAMS, STOPS, programFromTypeId, sharedAorMonth, type ProgramId, type Stop } from '../model';
import { DEFAULT_FILTERS, type CommunityFilters, type CommunitySort } from '../communityApi';
import { MY_TIMELINE_ID, useCommunity } from '../useCommunity';
import { useCommunityFeed } from '../useCommunityFeed';
import { PersonCard, useProgramLabel } from './TimelineCards';
import { FilterSheet, type SheetOption } from './FilterSheet';

type SheetKey = 'program' | 'aor' | 'stage' | 'sort';

/**
 * The Community list: a row of filter chips (each opens a bottom sheet), then
 * one card per shared timeline, loaded a page at a time as the user scrolls.
 * The user's own Share card lives on My timeline (MyShareCard).
 */
export function CommunityFeed({ contentContainerStyle }: { contentContainerStyle?: StyleProp<ViewStyle> }) {
  const c = useColors();
  const accent = useAccentColor();
  const { t, i18n } = useTranslation();
  const programLabel = useProgramLabel();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const typeId = useApplicationStore((st) => st.application?.typeId);
  const milestones = useTimelineStore((st) => st.milestones);
  const { settings } = useCommunity();
  const [filters, setFilters] = useState<CommunityFilters>(DEFAULT_FILTERS);
  const [sheet, setSheet] = useState<SheetKey | null>(null);
  const touched = useRef(false);
  const feed = useCommunityFeed(filters);

  const locale = i18n.language?.startsWith('fr') ? fr : enUS;
  const monthLabel = (m: string) => format(parseISO(`${m}-01`), 'MMM yyyy', { locale });

  // Start on the user's own program once their sharing settings load.
  useEffect(() => {
    if (settings && !touched.current) setFilters((f) => ({ ...f, program: settings.program }));
  }, [settings]);

  const set = (patch: Partial<CommunityFilters>) => { touched.current = true; setFilters((f) => ({ ...f, ...patch })); };

  // "My month": the user's program and AOR month in one tap.
  const myProgram = settings?.program ?? programFromTypeId(typeId);
  const myAor = useMemo(() => sharedAorMonth(milestones) ?? null, [milestones]);
  const onMyMonth = !!myAor && filters.program === myProgram && filters.aorMonth === myAor;

  const filtered = filters.program !== 'all' || !!filters.aorMonth || !!filters.stage;
  const clear = () => set({ program: 'all', aorMonth: null, stage: null });

  const sortLabels: Record<CommunitySort, string> = {
    recent: t('community.sortRecent'), longest: t('community.sortLongest'), furthest: t('community.sortFurthest'),
  };

  const months = Array.from({ length: 18 }, (_, i) => format(subMonths(new Date(), i), 'yyyy-MM'));
  const sheets = {
    program: {
      title: t('community.filterProgram'),
      selected: filters.program as ProgramId | 'all',
      options: [{ value: 'all', label: t('community.filterAll') },
        ...PROGRAMS.map((p) => ({ value: p.id, label: programLabel(p.id) }))] as SheetOption<ProgramId | 'all'>[],
      onSelect: (v: ProgramId | 'all') => set({ program: v }),
    },
    aor: {
      title: t('community.filterAorMonth'),
      selected: filters.aorMonth,
      options: [{ value: null, label: t('community.any') },
        ...months.map((m) => ({ value: m, label: monthLabel(m) }))] as SheetOption<string | null>[],
      onSelect: (v: string | null) => set({ aorMonth: v }),
    },
    stage: {
      title: t('community.filterStage'),
      selected: filters.stage,
      options: [{ value: null, label: t('community.any') },
        ...STOPS.map((st) => ({ value: st, label: t(`community.stops.${st}`) }))] as SheetOption<Stop | null>[],
      onSelect: (v: Stop | null) => set({ stage: v }),
    },
    sort: {
      title: t('community.filterSort'),
      selected: filters.sort,
      options: (['recent', 'longest', 'furthest'] as CommunitySort[]).map((v) => ({ value: v, label: sortLabels[v] })),
      onSelect: (v: CommunitySort) => set({ sort: v }),
    },
  };

  const chip = (key: string, label: string, on: boolean, onPress: () => void, icon?: React.ComponentProps<typeof Ionicons>['name'], caret = true) => (
    <TouchableOpacity key={key} ph-label={`community-filter-${key}`} onPress={onPress}
      accessibilityRole="button" accessibilityState={{ selected: on }}
      style={[s.chip, on ? { backgroundColor: c.textPrimary, borderColor: c.textPrimary } : { borderColor: c.border }]}>
      {icon && <Ionicons name={icon} size={14} color={on ? c.surfacePrimary : c.textSecondary} />}
      <Text style={[s.chipTxt, { color: on ? c.surfacePrimary : c.textSecondary }]}>{label}</Text>
      {caret && <Ionicons name="chevron-down" size={13} color={on ? c.surfacePrimary : c.textMuted} />}
    </TouchableOpacity>
  );

  const header = (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
      {myAor && chip('my-month', t('community.myMonth'), onMyMonth,
        () => (onMyMonth ? set({ aorMonth: null }) : set({ program: myProgram, aorMonth: myAor })), 'person', false)}
      {chip('program', filters.program === 'all' ? t('community.filterProgram') : programLabel(filters.program),
        filters.program !== 'all', () => setSheet('program'))}
      {chip('aor', filters.aorMonth ? t('community.aorIn', { month: monthLabel(filters.aorMonth) }) : t('community.filterAorMonth'),
        !!filters.aorMonth, () => setSheet('aor'))}
      {chip('stage', filters.stage ? t(`community.stops.${filters.stage}`) : t('community.filterStage'),
        !!filters.stage, () => setSheet('stage'))}
      {chip('sort', sortLabels[filters.sort], false, () => setSheet('sort'), 'swap-vertical')}
      {filtered && chip('clear', t('community.clearFilters'), false, clear, 'close', false)}
    </ScrollView>
  );

  const empty = feed.loading ? (
    <ActivityIndicator style={s.pad} color={accent} />
  ) : feed.error ? (
    <View style={s.pad}>
      <Text style={[s.empty, { color: c.textMuted }]}>{t('community.loadError')}</Text>
      <TouchableOpacity onPress={feed.retry} style={s.link}><Text style={[s.linkTxt, { color: accent }]}>{t('community.retry')}</Text></TouchableOpacity>
    </View>
  ) : (
    <View style={s.pad}>
      <Text style={[s.empty, { color: c.textMuted }]}>{filtered ? t('community.emptyFiltered') : t('community.empty')}</Text>
      {filtered && (
        <TouchableOpacity onPress={clear} style={s.link}><Text style={[s.linkTxt, { color: accent }]}>{t('community.clearFilters')}</Text></TouchableOpacity>
      )}
    </View>
  );

  const footer = feed.loadingMore ? <ActivityIndicator style={s.more} color={accent} />
    : feed.error && feed.items.length ? (
      <TouchableOpacity onPress={feed.retry} style={s.more}><Text style={[s.linkTxt, { color: accent }]}>{t('community.retry')}</Text></TouchableOpacity>
    ) : null;

  const open = sheet ? sheets[sheet] : null;

  return (
    <>
      <FlatList
        data={feed.items}
        keyExtractor={(tl) => tl.id}
        renderItem={({ item }) => (
          <PersonCard timeline={item} onPress={() => navigation.navigate('CommunityTimeline', { id: item.isMine ? MY_TIMELINE_ID : item.id })} />
        )}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        ListFooterComponent={footer}
        ItemSeparatorComponent={Gap}
        contentContainerStyle={[contentContainerStyle, s.wrap]}
        showsVerticalScrollIndicator={false}
        onEndReached={() => { void feed.loadMore(); }}
        onEndReachedThreshold={0.5}
        refreshControl={<RefreshControl refreshing={feed.refreshing} onRefresh={feed.refresh} tintColor={accent} />}
        initialNumToRender={8}
        windowSize={7}
      />
      {open && (
        <FilterSheet
          visible
          title={open.title}
          options={open.options as SheetOption<unknown>[]}
          selected={open.selected as unknown}
          onSelect={open.onSelect as (v: unknown) => void}
          onClose={() => setSheet(null)}
        />
      )}
    </>
  );
}

function Gap() { return <View style={{ height: 10 }} />; }

const s = StyleSheet.create({
  wrap: { paddingTop: spacing.sm },
  chips: { gap: spacing.sm, paddingVertical: spacing.xs, marginBottom: spacing.md },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: borderRadius.full, borderWidth: 1 },
  chipTxt: { fontSize: typography.sm, fontWeight: typography.semibold },
  pad: { paddingVertical: spacing.lg, alignItems: 'center' },
  empty: { fontSize: typography.sm, textAlign: 'center' },
  link: { marginTop: spacing.sm, padding: spacing.xs },
  linkTxt: { fontSize: typography.sm, fontWeight: typography.bold, textAlign: 'center' },
  more: { paddingVertical: spacing.lg, alignItems: 'center' },
});
