import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Text } from '@/components/common/AppText';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { palette, spacing, typography, borderRadius } from '@/theme';
import { useColors } from '@/hooks/useColors';
import { useAccentColor } from '@/hooks/useAccentColor';
import { Toggle } from '@/components/common/Toggle';
import { useTimelineStore } from '@/store/timelineStore';
import { useApplicationStore } from '@/store/applicationStore';
import { PROGRAMS, programFromTypeId, randomAlias, sharedAorMonth, toSharedSteps, type ProgramId, type SharedTimeline } from '../model';
import { useShareStore } from '../shareStore';
import { Avatar, PersonCard, useProgramLabel } from './TimelineCards';
import { AvatarPicker } from './AvatarPicker';
import { randomBuddyId } from './BuddyAvatar';

/**
 * Share my timeline: pick a display name, the program and whether months show,
 * with a live preview of the card others would see. Steps come from the live
 * timeline, so the shared card follows the user as they reach new milestones.
 */
export function ShareTimelineModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const c = useColors();
  const accent = useAccentColor();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const programLabel = useProgramLabel();
  const milestones = useTimelineStore((st) => st.milestones);
  const typeId = useApplicationStore((st) => st.application?.typeId);
  const { settings, share, stop } = useShareStore();

  const [alias, setAlias] = useState('');
  const [program, setProgram] = useState<ProgramId>('other');
  const [showMonths, setShowMonths] = useState(false);
  const [avatar, setAvatar] = useState<string | undefined>(undefined);
  const [picking, setPicking] = useState(false);
  const [nameError, setNameError] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setAlias(settings?.alias ?? '');
    setProgram(settings?.program ?? programFromTypeId(typeId));
    setShowMonths(settings?.showMonths ?? false);
    setAvatar(settings?.avatar);
    setNameError(false);
    // Only on open: share() swaps settings while saving, and re-running this would wipe a refused name.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const steps = useMemo(() => toSharedSteps(milestones, showMonths), [milestones, showMonths]);
  const aorMonth = useMemo(() => sharedAorMonth(milestones), [milestones]);
  const preview: SharedTimeline = {
    id: 'mine', alias: alias.trim(), program, steps, updatedDaysAgo: 0, isMine: true,
    ...(aorMonth ? { aorMonth } : {}), ...(avatar ? { avatar } : {}),
  };
  const canShare = steps.length > 0;

  const surprise = () => { setAlias(randomAlias()); setAvatar(randomBuddyId()); setNameError(false); };

  const save = async () => {
    if (!canShare) return;
    const result = await share({ alias: alias.trim(), program, showMonths, ...(avatar ? { avatar } : {}) });
    if (result === 'badName') { setNameError(true); return; }
    onClose();
    if (result === 'offline') Toast.show({ type: 'error', text1: t('community.shareFailed') });
    if (result === 'invalid') Toast.show({ type: 'error', text1: t('community.shareInvalid') });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[s.flex, { backgroundColor: c.surfacePrimary }]} edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[s.bar, { borderBottomColor: c.border }]}>
            <TouchableOpacity onPress={onClose} style={[s.barBtn, { borderColor: c.border }]}>
              <Text style={[s.barBtnTxt, { color: c.textMuted }]}>{t('community.cancel')}</Text>
            </TouchableOpacity>
            <Text style={[s.barTitle, { color: c.textPrimary }]}>{t('community.shareTitle')}</Text>
            <TouchableOpacity ph-label="community-share-save" onPress={save} disabled={!canShare}
              style={[s.barBtn, { borderColor: canShare ? accent : c.border }]}>
              <Text style={[s.barBtnTxt, { color: canShare ? accent : c.textMuted, fontWeight: typography.bold }]}>
                {settings ? t('community.saveAction') : t('community.shareAction')}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={[s.body, { paddingBottom: insets.bottom + spacing['2xl'] }]}
            keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={[s.label, { color: c.textMuted }]}>{t('community.previewLabel')}</Text>
            {canShare ? (
              <PersonCard timeline={preview} />
            ) : (
              <View style={[s.empty, { borderColor: c.border }]}>
                <Ionicons name="time-outline" size={22} color={c.textMuted} />
                <Text style={[s.emptyTxt, { color: c.textSecondary }]}>{t('community.noMilestones')}</Text>
              </View>
            )}

            <Text style={[s.label, s.gapTop, { color: c.textMuted }]}>{t('community.avatarLabel')}</Text>
            <TouchableOpacity ph-label="community-avatar-change" onPress={() => setPicking(true)}
              style={[s.row, { backgroundColor: c.surfaceCard, borderColor: c.border }]} accessibilityRole="button">
              <Avatar alias={alias.trim() || t('community.anonymous')} avatar={avatar} size={48} />
              <Text style={[s.rowTitle, s.flex, { color: c.textPrimary }]}>{t('community.avatarChange')}</Text>
              <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity ph-label="community-surprise-me" onPress={surprise}
              style={[s.surprise, { borderColor: accent, backgroundColor: accent + '14' }]}
              accessibilityRole="button" accessibilityHint={t('community.surpriseHint')}>
              <Ionicons name="shuffle" size={17} color={accent} />
              <Text style={[s.surpriseTxt, { color: accent }]}>{t('community.surpriseMe')}</Text>
            </TouchableOpacity>

            <Text style={[s.label, s.gapTop, { color: c.textMuted }]}>{t('community.aliasLabel')}</Text>
            <TextInput
              style={[s.input, { backgroundColor: c.surfaceCard, borderColor: nameError ? palette.danger : c.border, color: c.textPrimary }]}
              value={alias}
              onChangeText={(v) => { setAlias(v); setNameError(false); }}
              placeholder={t('community.anonymous')}
              placeholderTextColor={c.textMuted}
              maxLength={24}
              autoCorrect={false}
            />
            <Text style={[s.hint, { color: nameError ? palette.danger : c.textMuted }]} accessibilityLiveRegion="polite">
              {nameError ? t('community.nameNotAllowed') : t('community.aliasHint')}
            </Text>

            <Text style={[s.label, s.gapTop, { color: c.textMuted }]}>{t('community.programLabel')}</Text>
            <View style={s.chips}>
              {PROGRAMS.map((p) => {
                const on = p.id === program;
                return (
                  <TouchableOpacity key={p.id} ph-label={`community-program-${p.id}`} onPress={() => setProgram(p.id)}
                    style={[s.chip, { borderColor: on ? accent : c.border, backgroundColor: on ? accent : c.surfaceCard }]}
                    accessibilityRole="radio" accessibilityState={{ selected: on }}>
                    <Text style={[s.chipTxt, { color: on ? palette.white : c.textSecondary }]}>{programLabel(p.id)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={[s.row, s.gapTop, { backgroundColor: c.surfaceCard, borderColor: c.border }]}>
              <View style={s.flex}>
                <Text style={[s.rowTitle, { color: c.textPrimary }]}>{t('community.monthsLabel')}</Text>
                <Text style={[s.hint, { color: c.textMuted, marginTop: 2 }]}>{t('community.monthsHint')}</Text>
              </View>
              <Toggle value={showMonths} onValueChange={() => setShowMonths((v) => !v)} activeColor={accent}
                accessibilityLabel={t('community.monthsLabel')} />
            </View>

            <View style={[s.privacy, s.gapTop, { backgroundColor: c.surfaceCard, borderColor: c.border }]}>
              <Text style={[s.rowTitle, { color: c.textPrimary }]}>{t('community.sharedLabel')}</Text>
              <View style={s.privRow}>
                <Ionicons name="checkmark-circle" size={16} color={palette.success} />
                <Text style={[s.privTxt, { color: c.textSecondary }]}>{t('community.sharedYes')}</Text>
              </View>
              <View style={s.privRow}>
                <Ionicons name="close-circle" size={16} color={palette.danger} />
                <Text style={[s.privTxt, { color: c.textSecondary }]}>{t('community.sharedNo')}</Text>
              </View>
            </View>

            {settings && (
              <TouchableOpacity ph-label="community-share-stop" onPress={async () => {
                if (await stop()) onClose();
                else Toast.show({ type: 'error', text1: t('community.stopFailed') });
              }} style={s.stop}>
                <Ionicons name="eye-off-outline" size={16} color={palette.danger} />
                <Text style={[s.stopTxt, { color: palette.danger }]}>{t('community.stopSharing')}</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
      <AvatarPicker visible={picking} alias={alias.trim()} selected={avatar} onSelect={setAvatar} onClose={() => setPicking(false)} />
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
  label: { fontSize: typography.xs, fontWeight: typography.semibold, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: spacing.xs },
  gapTop: { marginTop: spacing.lg },
  hint: { fontSize: typography.xs, lineHeight: 16, marginTop: spacing.xs },
  input: { borderRadius: borderRadius.md, borderWidth: 0.3, paddingHorizontal: spacing.md, paddingVertical: spacing.md, fontSize: typography.base },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: 7, borderRadius: borderRadius.full, borderWidth: 1 },
  chipTxt: { fontSize: typography.sm, fontWeight: typography.semibold },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: borderRadius.md, borderWidth: 0.3, padding: spacing.base },
  rowTitle: { fontSize: typography.base, fontWeight: typography.semibold },
  surprise: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.sm,
              paddingVertical: spacing.md, borderRadius: borderRadius.md, borderWidth: 1 },
  surpriseTxt: { fontSize: typography.base, fontWeight: typography.semibold },
  privacy: { borderRadius: borderRadius.md, borderWidth: 0.3, padding: spacing.base, gap: spacing.sm },
  privRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  privTxt: { flex: 1, fontSize: typography.sm, lineHeight: 19 },
  empty: { borderWidth: 1, borderStyle: 'dashed', borderRadius: borderRadius.md, padding: spacing.base, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  emptyTxt: { flex: 1, fontSize: typography.sm, lineHeight: 19 },
  stop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.xl, paddingVertical: spacing.md },
  stopTxt: { fontSize: typography.base, fontWeight: typography.semibold },
});
