import React from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { spacing, typography, borderRadius } from '@/theme';
import { useColors } from '@/hooks/useColors';
import { useAccentColor } from '@/hooks/useAccentColor';
import { MILESTONE_META } from '@/features/timeline/milestoneMeta';
import { reachedIndex, type SharedTimeline } from '../model';
import { Avatar, StopTrack, useProgramLabel } from './TimelineCards';

/** A shared timeline in full: every step, its day, and the gap since the step before. */
export function TimelineDetailModal({ timeline, onClose, onEdit }: { timeline: SharedTimeline | null; onClose: () => void; onEdit?: (() => void) | undefined }) {
  const c = useColors();
  const accent = useAccentColor();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const programLabel = useProgramLabel();
  const alias = timeline?.alias || t('community.anonymous');

  return (
    <Modal visible={!!timeline} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[s.flex, { backgroundColor: c.surfacePrimary }]} edges={['top', 'left', 'right']}>
        <View style={[s.bar, { borderBottomColor: c.border }]}>
          {onEdit ? (
            <TouchableOpacity ph-label="community-share-edit" onPress={onEdit} style={[s.barBtn, { borderColor: accent }]}>
              <Text style={[s.barBtnTxt, { color: accent, fontWeight: typography.bold }]}>{t('community.edit')}</Text>
            </TouchableOpacity>
          ) : (
            <Text style={[s.barTitle, { color: c.textPrimary }]}>{t('community.detailTitle')}</Text>
          )}
          <TouchableOpacity ph-label="community-detail-close" onPress={onClose} style={[s.barBtn, { borderColor: c.border }]}>
            <Text style={[s.barBtnTxt, { color: c.textMuted }]}>{t('community.close')}</Text>
          </TouchableOpacity>
        </View>

        {timeline && (
          <ScrollView contentContainerStyle={[s.body, { paddingBottom: insets.bottom + spacing['2xl'] }]} showsVerticalScrollIndicator={false}>
            <View style={s.who}>
              <Avatar alias={alias} size={56} />
              <Text style={[s.alias, { color: c.textPrimary }]}>{alias}</Text>
              <Text style={[s.sub, { color: c.textMuted }]}>{programLabel(timeline.program)}</Text>
            </View>

            <View style={[s.trackCard, { backgroundColor: c.surfaceCard, borderColor: c.border }]}>
              <StopTrack reached={reachedIndex(timeline)} showLabels />
            </View>

            {timeline.steps.map((step, i) => {
              const meta = MILESTONE_META[step.type];
              const gap = i > 0 ? step.day - timeline.steps[i - 1]!.day : 0;
              const last = i === timeline.steps.length - 1;
              return (
                <View key={`${step.type}-${i}`}>
                  {i > 0 && (
                    <View style={s.gapRow}>
                      <View style={[s.gapLine, { backgroundColor: c.border }]} />
                      <Text style={[s.gapTxt, { color: c.textMuted }]}>
                        {gap === 1 ? t('community.plusDay') : t('community.plusDays', { n: gap })}
                      </Text>
                    </View>
                  )}
                  <View style={[s.step, { backgroundColor: c.surfaceCard, borderColor: last ? accent : c.border }, last && { borderWidth: 1 }]}>
                    <View style={[s.stepIcon, { backgroundColor: meta.color + '20' }]}>
                      <Ionicons name={meta.icon} size={20} color={meta.color} />
                    </View>
                    <View style={s.flex}>
                      <Text style={[s.stepLabel, { color: c.textPrimary }]}>{t(meta.labelKey)}</Text>
                      {!!step.month && (
                        <Text style={[s.stepMonth, { color: c.textMuted }]}>{format(parseISO(`${step.month}-01`), 'MMM yyyy')}</Text>
                      )}
                    </View>
                    <Text style={[s.stepDay, { color: meta.color }]}>{t('community.dayN', { n: step.day })}</Text>
                  </View>
                </View>
              );
            })}
            <Text style={[s.foot, { color: c.textMuted }]}>{t('community.detailFoot')}</Text>
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg,
         paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  barTitle: { fontSize: typography.base, fontWeight: typography.semibold },
  barBtn: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: borderRadius.md, borderWidth: 1, minWidth: 72, alignItems: 'center' },
  barBtnTxt: { fontSize: typography.base },
  body: { padding: spacing.base },
  who: { alignItems: 'center', gap: 4, marginBottom: spacing.lg },
  alias: { fontSize: typography.lg, fontWeight: typography.bold, marginTop: spacing.sm },
  sub: { fontSize: typography.sm },
  trackCard: { borderRadius: borderRadius.md, borderWidth: 0.3, padding: spacing.base, marginBottom: spacing.lg },
  gapRow: { flexDirection: 'row', alignItems: 'center', height: 28, paddingLeft: 34 },
  gapLine: { width: 2, height: '100%', marginRight: spacing.md },
  gapTxt: { fontSize: typography.xs, fontWeight: typography.semibold },
  step: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: borderRadius.md, borderWidth: 0.3, padding: spacing.base },
  stepIcon: { width: 40, height: 40, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center' },
  stepLabel: { fontSize: typography.base, fontWeight: typography.semibold },
  stepMonth: { fontSize: typography.xs, marginTop: 2 },
  stepDay: { fontSize: typography.base, fontWeight: typography.bold, fontVariant: ['tabular-nums'] },
  foot: { fontSize: typography.xs, textAlign: 'center', marginTop: spacing.lg, lineHeight: 17 },
});
