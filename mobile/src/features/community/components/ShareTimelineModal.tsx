import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from '@/components/common/AppText';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { palette, spacing, typography, borderRadius } from '@/theme';
import { useColors } from '@/hooks/useColors';
import { useAccentColor } from '@/hooks/useAccentColor';
import { Button } from '@/components/common/Button';
import { useTimelineStore } from '@/store/timelineStore';
import { useApplicationStore } from '@/store/applicationStore';
import { PROGRAMS, programFromTypeId, randomAlias, toSharedSteps, type ProgramId } from '../model';
import { useShareStore } from '../shareStore';
import { Avatar, useProgramLabel } from './TimelineCards';
import { AvatarPicker } from './AvatarPicker';
import { randomBuddyId } from './BuddyAvatar';

/**
 * Share my timeline: a display name and avatar (random on the first share), the
 * and the program. Each step's month and year is always shared. Steps come from the live timeline, so the
 * shared card follows the user as they reach new milestones.
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
  const [avatar, setAvatar] = useState<string | undefined>(undefined);
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    if (!visible) return;
    // First share: start from a random name and avatar. Once shared, keep what they chose (even Anonymous).
    setAlias(settings ? settings.alias : randomAlias());
    setProgram(settings?.program ?? programFromTypeId(typeId));
    setAvatar(settings ? settings.avatar : randomBuddyId());
    // Only on open: share() swaps settings while saving, and re-running this would wipe a refused name.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const steps = useMemo(() => toSharedSteps(milestones, true), [milestones]);
  const canShare = steps.length > 0;

  const shuffle = () => { setAlias(randomAlias()); setAvatar(randomBuddyId()); };

  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (!canShare || saving) return;
    setSaving(true);
    let result;
    try { result = await share({ alias: alias.trim(), program, showMonths: true, ...(avatar ? { avatar } : {}) }); }
    finally { setSaving(false); }
    // Only an old custom name can be refused now; keep the sheet open so they can shuffle.
    if (result === 'badName') { Toast.show({ type: 'error', text1: t('community.nameNotAllowed') }); return; }
    onClose();
    if (result === 'offline') Toast.show({ type: 'error', text1: t('community.shareFailed') });
    if (result === 'invalid') Toast.show({ type: 'error', text1: t('community.shareInvalid') });
  };

  const card = [s.card, { backgroundColor: c.surfaceCard, borderColor: c.border }];
  const divider = [s.divider, { backgroundColor: c.border }];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[s.flex, { backgroundColor: c.surfacePrimary }]} edges={['top', 'left', 'right']}>
        <View style={s.flex}>
          <View style={[s.bar, { borderBottomColor: c.border }]}>
            <TouchableOpacity onPress={onClose} hitSlop={8} style={s.barSide}>
              <Text style={[s.barBtnTxt, { color: c.textSecondary }]}>{t('community.cancel')}</Text>
            </TouchableOpacity>
            <Text style={[s.barTitle, { color: c.textPrimary }]} numberOfLines={1}>{t('community.shareTitle')}</Text>
            {/* Keeps the title centred. */}
            <View style={s.barSide} />
          </View>

          <ScrollView contentContainerStyle={[s.body, { paddingBottom: insets.bottom + spacing['2xl'] }]}
            keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {!canShare && (
              <View style={[s.notice, { backgroundColor: accent + '12', borderColor: accent + '40' }]}>
                <Ionicons name="time-outline" size={20} color={accent} />
                <Text style={[s.noticeTxt, { color: c.textPrimary }]}>{t('community.noMilestones')}</Text>
              </View>
            )}

            {/* Profile: how you appear */}
            <Text style={[s.label, { color: c.textMuted }]}>{t('community.profileLabel')}</Text>
            <View style={card}>
              <View style={s.identity}>
                <TouchableOpacity ph-label="community-avatar-change" onPress={() => setPicking(true)}
                  accessibilityRole="button" accessibilityLabel={t('community.avatarChange')}>
                  <Avatar alias={alias.trim() || t('community.anonymous')} avatar={avatar} size={64} />
                  <View style={[s.editBadge, { backgroundColor: accent, borderColor: c.surfaceCard }]}>
                    <Ionicons name="pencil" size={11} color={palette.white} />
                  </View>
                </TouchableOpacity>
                <View style={s.flex}>
                  <Text style={[s.fieldLabel, { color: c.textSecondary }]}>{t('community.aliasLabel')}</Text>
                  {/* Read-only: names come from Shuffle both, so no one can type a real name or anything offensive. */}
                  <View style={[s.input, s.nameBox, { backgroundColor: c.surfacePrimary, borderColor: c.border }]}
                    accessible accessibilityLabel={`${t('community.aliasLabel')}: ${alias.trim() || t('community.anonymous')}`}>
                    <Text style={[s.nameTxt, { color: alias.trim() ? c.textPrimary : c.textMuted }]} numberOfLines={1}>
                      {alias.trim() || t('community.anonymous')}
                    </Text>
                    <Ionicons name="lock-closed" size={13} color={c.textMuted} />
                  </View>
                </View>
              </View>
              <Text style={[s.hint, { color: c.textMuted }]}>{t('community.aliasHint')}</Text>
              <View style={divider} />
              <View style={s.actions}>
                <TouchableOpacity ph-label="community-avatar-change-btn" onPress={() => setPicking(true)}
                  style={s.action} accessibilityRole="button">
                  <Ionicons name="happy-outline" size={17} color={accent} />
                  <Text style={[s.actionTxt, { color: accent }]}>{t('community.avatarChange')}</Text>
                </TouchableOpacity>
                <View style={[s.actionSep, { backgroundColor: c.border }]} />
                <TouchableOpacity ph-label="community-shuffle-identity" onPress={shuffle}
                  style={s.action} accessibilityRole="button" accessibilityHint={t('community.shuffleHint')}>
                  <Ionicons name="shuffle" size={17} color={accent} />
                  <Text style={[s.actionTxt, { color: accent }]}>{t('community.shuffleIdentity')}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Program */}
            <Text style={[s.label, s.gapTop, { color: c.textMuted }]}>{t('community.programLabel')}</Text>
            <View style={[card, s.chips]}>
              {PROGRAMS.map((p) => {
                const on = p.id === program;
                return (
                  <TouchableOpacity key={p.id} ph-label={`community-program-${p.id}`} onPress={() => setProgram(p.id)}
                    style={[s.chip, { borderColor: on ? accent : c.border, backgroundColor: on ? accent : c.surfacePrimary }]}
                    accessibilityRole="radio" accessibilityState={{ selected: on }}>
                    <Text style={[s.chipTxt, { color: on ? palette.white : c.textSecondary }]}>{programLabel(p.id)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Button ph-label="community-share-save" title={settings ? t('community.saveAction') : t('community.shareAction')}
              onPress={save} disabled={!canShare || saving} loading={saving} fullWidth size="lg" style={s.shareBtn}
              icon={<Ionicons name={settings ? 'checkmark-circle-outline' : 'people-outline'} size={19} color={palette.white} />} />

            <View style={s.note}>
              <Ionicons name="lock-closed-outline" size={14} color={c.textMuted} />
              <Text style={[s.noteTxt, { color: c.textMuted }]}>{t('community.shareNote')}</Text>
            </View>

            {settings && (
              <TouchableOpacity ph-label="community-share-stop" onPress={async () => {
                if (await stop()) onClose();
                else Toast.show({ type: 'error', text1: t('community.stopFailed') });
              }} style={[s.stop, { borderColor: palette.danger + '55' }]} accessibilityRole="button">
                <Ionicons name="eye-off-outline" size={16} color={palette.danger} />
                <Text style={[s.stopTxt, { color: palette.danger }]}>{t('community.stopSharing')}</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </SafeAreaView>
      <AvatarPicker visible={picking} alias={alias.trim()} selected={avatar} onSelect={setAvatar} onClose={() => setPicking(false)} />
    </Modal>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  bar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.base,
         paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  barSide: { width: 96 },
  barTitle: { flex: 1, textAlign: 'center', fontSize: typography.base, fontWeight: typography.semibold },
  barBtnTxt: { fontSize: typography.base },
  shareBtn: { marginTop: spacing.xl },
  body: { padding: spacing.base, paddingTop: spacing.lg },
  label: { fontSize: typography.xs, fontWeight: typography.semibold, letterSpacing: 0.8, textTransform: 'uppercase',
           marginBottom: spacing.sm, marginLeft: spacing.xs },
  gapTop: { marginTop: spacing.xl },
  card: { borderRadius: borderRadius.lg, borderWidth: 0.3, padding: spacing.base },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: spacing.md },
  notice: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1, borderRadius: borderRadius.lg,
            padding: spacing.base, marginBottom: spacing.xl },
  noticeTxt: { flex: 1, fontSize: typography.sm, lineHeight: 19 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.base },
  editBadge: { position: 'absolute', right: -2, bottom: -2, width: 22, height: 22, borderRadius: 11, borderWidth: 2,
               alignItems: 'center', justifyContent: 'center' },
  fieldLabel: { fontSize: typography.xs, fontWeight: typography.semibold, marginBottom: 6 },
  input: { borderRadius: borderRadius.md, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: 10 },
  nameBox: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  nameTxt: { flex: 1, fontSize: typography.base, fontWeight: typography.semibold },
  hint: { fontSize: typography.xs, lineHeight: 16, marginTop: spacing.sm },
  actions: { flexDirection: 'row', alignItems: 'center', marginVertical: -spacing.xs },
  action: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: spacing.sm },
  actionSep: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch' },
  actionTxt: { fontSize: typography.sm, fontWeight: typography.semibold },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: 7, borderRadius: borderRadius.full, borderWidth: 1 },
  chipTxt: { fontSize: typography.sm, fontWeight: typography.semibold },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginTop: spacing.lg, paddingHorizontal: spacing.xs },
  noteTxt: { flex: 1, fontSize: typography.xs, lineHeight: 17 },
  stop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.xl,
          paddingVertical: spacing.md, borderRadius: borderRadius.lg, borderWidth: 1 },
  stopTxt: { fontSize: typography.base, fontWeight: typography.semibold },
});
