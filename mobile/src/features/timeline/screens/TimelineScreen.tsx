import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format, differenceInDays, parseISO, isValid } from 'date-fns';
import { palette, spacing, typography, borderRadius } from '@/theme';
import { useColors, useResolvedScheme } from '@/hooks/useColors';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useTimelineStore, type Milestone, type MilestoneType } from '@/store/timelineStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTabBarLayout } from '@/hooks/useTabBarLayout';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { AppHeader } from '@/components/layout/AppHeader';

// ─── Milestone metadata ───────────────────────────────────────────────────────

type Meta = { icon: React.ComponentProps<typeof Ionicons>['name']; color: string };

const MILESTONE_META: Record<MilestoneType, Meta> = {
  'ITA':                   { icon: 'mail-open',         color: palette.info },
  'Application Submitted': { icon: 'cloud-upload',      color: palette.success },
  'AOR Received':          { icon: 'document-text',     color: palette.success },
  'Biometrics Requested':  { icon: 'finger-print',      color: palette.warning },
  'Biometrics Completed':  { icon: 'shield-checkmark',  color: palette.success },
  'Medical Requested':     { icon: 'medkit',            color: palette.warning },
  'Medical Passed':        { icon: 'pulse',             color: palette.success },
  'Passport Requested':    { icon: 'id-card',           color: palette.warning },
  'Passport Submitted':    { icon: 'send',              color: palette.info },
  'Passport Collected':    { icon: 'airplane',          color: palette.success },
  'ADR':                   { icon: 'document-attach',   color: palette.orange },
  'Portal 1':              { icon: 'log-in',            color: palette.purple },
  'Portal 2':              { icon: 'globe',             color: palette.purpleDeep },
  'Final Decision':        { icon: 'trophy',            color: palette.danger },
  'Custom':                { icon: 'pencil',            color: palette.gray300 },
};

const MILESTONE_TYPES: MilestoneType[] = [
  'ITA', 'Application Submitted', 'AOR Received',
  'Biometrics Requested', 'Biometrics Completed',
  'Medical Requested', 'Medical Passed',
  'Passport Requested', 'Passport Submitted', 'Passport Collected',
  'ADR', 'Portal 1', 'Portal 2',
  'Final Decision', 'Custom',
];

// Illustrative rows shown on the empty timeline so new users can see the kind of
// milestones they can track. Not real data — dates are placeholders.
const SAMPLE_MILESTONES: { type: MilestoneType; when: string }[] = [
  { type: 'ITA',                when: 'e.g. Jan 12' },
  { type: 'AOR Received',       when: 'e.g. Feb 03' },
  { type: 'Passport Requested', when: 'e.g. Apr 22' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function useDaysLabel() {
  const { t } = useTranslation();
  return (dateStr: string): { value: string; sub: string; future: boolean } => {
    const diff = differenceInDays(new Date(), parseISO(dateStr));
    if (diff === 0) return { value: t('timeline.today'), sub: '', future: false };
    if (diff > 0)  return { value: String(diff), sub: diff === 1 ? t('timeline.dayAgo') : t('timeline.daysAgo'), future: false };
    return { value: String(Math.abs(diff)), sub: t('timeline.daysLeft'), future: true };
  };
}


// ─── Milestone card ───────────────────────────────────────────────────────────

function MilestoneCard({ item, onEdit }: { item: Milestone; onEdit: () => void; onDelete?: () => void }) {
  const c = useColors();
  const meta = MILESTONE_META[item.type];
  const label = item.type === 'Custom' && item.customLabel ? item.customLabel : item.type;
  const getDaysLabel = useDaysLabel();
  const dl = getDaysLabel(item.date);

  return (
    <TouchableOpacity
      style={[s.card, { backgroundColor: c.surfaceCard, borderColor: c.border }]}
      onPress={onEdit}
      activeOpacity={0.8}
    >
      <View style={[s.cardIcon, { backgroundColor: meta.color + '20' }]}>
        {item.type === 'Custom' && item.customEmoji
          ? <Text style={s.cardEmoji}>{item.customEmoji}</Text>
          : <Ionicons name={meta.icon} size={22} color={meta.color} />}
      </View>
      <View style={s.cardMid}>
        <Text style={[s.cardTitle, { color: c.textPrimary }]}>{label}</Text>
        <Text style={[s.cardDate,  { color: c.textMuted }]}>
          {isValid(parseISO(item.date)) ? format(parseISO(item.date), 'MMM d, yyyy') : item.date}
        </Text>
        {!!item.note && (
          <Text style={[s.cardNote, { color: c.textSecondary }]} numberOfLines={1}>
            {item.note}
          </Text>
        )}
      </View>
      <View style={s.cardRight}>
        <Text style={[s.daysVal, { color: dl.future ? palette.warning : meta.color }]}>
          {dl.value}
        </Text>
        {!!dl.sub && (
          <Text style={[s.daysSub, { color: c.textMuted }]}>{dl.sub}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}



// ─── Add Milestone Modal ──────────────────────────────────────────────────────

function AddMilestoneModal({ visible, onClose, editing }: {
  visible: boolean;
  onClose: () => void;
  editing?: Milestone | null | undefined;
}) {
  const c = useColors();
  const accent = useAccentColor();
  const scheme = useResolvedScheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const add    = useTimelineStore((s) => s.add);
  const update = useTimelineStore((s) => s.update);
  const remove = useTimelineStore((s) => s.remove);

  const [type,        setType]        = useState<MilestoneType>('ITA');
  const [customLabel, setCustomLabel] = useState('');
  const [customEmoji, setCustomEmoji] = useState('');
  const [date,        setDate]        = useState(new Date());
  const [showPicker,  setShowPicker]  = useState(false);
  const [note,        setNote]        = useState('');
  const [pickingType, setPickingType] = useState(false);
  // iOS compact DateTimePicker ignores the date it mounts with (renders
  // epoch "Dec 31, 1969") — the native side only applies the date on prop
  // *updates*. Mount it after the modal's onShow, then nudge the state by
  // 1s so a fresh prop reaches the native picker and it repaints correctly.
  const [pickerReady, setPickerReady] = useState(false);
  useEffect(() => {
    if (!pickerReady) return undefined;
    const id = setTimeout(() => setDate((d) => new Date(d.getTime() + 1000)), 50);
    return () => clearTimeout(id);
  }, [pickerReady]);
  const emojiInputRef = useRef<TextInput>(null);

  // Pre-fill when editing
  useEffect(() => {
    if (editing) {
      setType(editing.type);
      setCustomLabel(editing.customLabel ?? '');
      setCustomEmoji(editing.customEmoji ?? '');
      const parsed = parseISO(editing.date);
      setDate(isValid(parsed) ? parsed : new Date());
      setNote(editing.note ?? '');
    } else {
      reset();
    }
  }, [editing, visible]);

  function reset() {
    setType('ITA'); setCustomLabel(''); setCustomEmoji(''); setNote('');
    setDate(new Date()); setShowPicker(false); setPickingType(false);
    setPickerReady(false);
  }

  async function handleSave() {
    if (type === 'Custom' && !customLabel.trim()) {
      Alert.alert(t('timeline.labelRequired'), t('timeline.labelRequiredMsg'));
      return;
    }
    const payload = {
      type, date: format(date, 'yyyy-MM-dd'), note: note.trim(),
      customLabel: type === 'Custom' ? customLabel.trim() : undefined,
      customEmoji: type === 'Custom' && customEmoji.trim() ? customEmoji.trim() : undefined,
    };
    if (editing) {
      await update(editing.id, payload);
    } else {
      await add(payload);
    }
    reset(); onClose();
  }

  async function handleDelete() {
    if (!editing) return;
    Alert.alert(t('timeline.deleteConfirmTitle'), t('timeline.deleteConfirmMsg'), [
      { text: t('timeline.cancel'), style: 'cancel' },
      { text: t('timeline.delete'), style: 'destructive', onPress: async () => { await remove(editing.id); reset(); onClose(); } },
    ]);
  }

  const meta = MILESTONE_META[type];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet"
      onShow={() => setPickerReady(true)}
      onRequestClose={() => { reset(); onClose(); }}>
      <SafeAreaView style={[s.modal, { backgroundColor: c.surfacePrimary }]} edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView
          style={s.modalKeyboard}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
        {/* Top bar */}
        <View style={[s.modalBar, { borderBottomColor: c.border }]}>
          <TouchableOpacity onPress={() => { reset(); onClose(); }} style={[s.modalBtn, { borderColor: c.border }]}>
            <Text style={[s.modalBtnTxt, { color: c.textMuted }]}>{t('timeline.cancel')}</Text>
          </TouchableOpacity>
          <Text style={[s.modalTitle, { color: c.textPrimary }]}>{editing ? t('timeline.editMilestone') : t('timeline.addMilestone')}</Text>
          <TouchableOpacity onPress={handleSave} style={[s.modalBtn, { borderColor: accent }]}>
            <Text style={[s.modalBtnTxt, { color: accent, fontWeight: typography.bold }]}>{t('timeline.save')}</Text>
          </TouchableOpacity>
        </View>

        {/* Delete row — only in edit mode */}
        {editing && (
          <TouchableOpacity
            style={[s.deleteRow, { borderBottomColor: c.border }]}
            onPress={handleDelete}
          >
            <Ionicons name="trash-outline" size={16} color={palette.danger} />
            <Text style={[s.deleteTxt, { color: palette.danger }]}>{t('timeline.deleteMilestone')}</Text>
          </TouchableOpacity>
        )}

        <ScrollView
          contentContainerStyle={[s.modalBody, { paddingBottom: insets.bottom + spacing['2xl'] }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* Type */}
          <Text style={[s.fieldLabel, { color: c.textMuted }]}>{t('timeline.fieldType')}</Text>
          <TouchableOpacity
            style={[s.fieldRow, { backgroundColor: c.surfaceCard, borderColor: c.border }]}
            onPress={() => setPickingType(true)}
          >
            <View style={[s.typeIcon, { backgroundColor: meta.color + '20' }]}>
              <Ionicons name={meta.icon} size={20} color={meta.color} />
            </View>
            <Text style={[s.fieldVal, { color: c.textPrimary, flex: 1 }]}>
              {type === 'Custom' && customLabel ? customLabel : type}
            </Text>
            <Ionicons name="chevron-down" size={16} color={c.textMuted} />
          </TouchableOpacity>

          {/* Custom label + emoji */}
          {type === 'Custom' && (
            <>
              <Text style={[s.fieldLabel, { color: c.textMuted, marginTop: spacing.lg }]}>{t('timeline.fieldLabel')}</Text>
              <TextInput
                style={[s.input, { backgroundColor: c.surfaceCard, borderColor: c.border, color: c.textPrimary }]}
                placeholder={t('timeline.labelPlaceholder')}
                placeholderTextColor={c.textMuted}
                value={customLabel}
                onChangeText={setCustomLabel}
                maxLength={60}
              />
              <Text style={[s.fieldLabel, { color: c.textMuted, marginTop: spacing.lg }]}>{t('timeline.fieldEmoji')}</Text>
              <TouchableOpacity
                activeOpacity={1}
                style={[s.emojiPickerRow, { backgroundColor: c.surfaceCard, borderColor: c.border }]}
                onPress={() => emojiInputRef.current?.focus()}
              >
                <TextInput
                  ref={emojiInputRef}
                  style={[s.emojiPickerInput, { color: c.textPrimary, borderColor: customEmoji ? accent : c.border }]}
                  value={customEmoji}
                  onChangeText={v => {
                    const chars = [...v];
                    setCustomEmoji(chars[chars.length - 1] ?? '');
                  }}
                  placeholderTextColor={c.textMuted}
                  maxLength={8}
                  keyboardType="default"
                />
                <Text style={[s.emojiPickerHint, { color: c.textMuted }]}>
                  {t('timeline.emojiHint')}
                </Text>
              </TouchableOpacity>
            </>
          )}

          {/* Date */}
          <Text style={[s.fieldLabel, { color: c.textMuted, marginTop: spacing.lg }]}>{t('timeline.fieldDate')}</Text>

          {Platform.OS === 'ios' ? (
            /* iOS: compact chip that opens a native calendar popover on tap.
               Use space-between (not a flex spacer) so the native picker keeps
               its natural width — squeezing it makes it misrender the value. */
            <View style={[s.fieldRow, { backgroundColor: c.surfaceCard, borderColor: c.border, justifyContent: 'space-between' }]}>
              <Ionicons name="calendar-outline" size={18} color={accent} />
              {pickerReady ? (
                <DateTimePicker
                  value={isValid(date) ? date : new Date()}
                  mode="date"
                  display="compact"
                  onChange={(_e, d) => { if (d && d.getFullYear() > 2000) setDate(d); }}
                  themeVariant={scheme}
                />
              ) : (
                <Text style={[s.fieldVal, { color: c.textPrimary }]}>
                  {format(date, 'MMM d, yyyy')}
                </Text>
              )}
            </View>
          ) : (
            /* Android: tap row → native calendar dialog */
            <>
              <TouchableOpacity
                style={[s.fieldRow, { backgroundColor: c.surfaceCard, borderColor: c.border }]}
                onPress={() => setShowPicker(true)}
              >
                <Ionicons name="calendar-outline" size={18} color={accent} />
                <Text style={[s.fieldVal, { color: c.textPrimary, flex: 1 }]}>
                  {format(date, 'MMM d, yyyy')}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
              </TouchableOpacity>
              {showPicker && (
                <DateTimePicker
                  value={isValid(date) ? date : new Date()}
                  mode="date"
                  display="default"
                  onChange={(_e, d) => { setShowPicker(false); if (d) setDate(d); }}
                />
              )}
            </>
          )}

          {/* Note */}
          <Text style={[s.fieldLabel, { color: c.textMuted, marginTop: spacing.lg }]}>{t('timeline.fieldNote')}</Text>
          <TextInput
            style={[s.noteInput, { backgroundColor: c.surfaceCard, borderColor: c.border, color: c.textPrimary }]}
            placeholder={t('timeline.notePlaceholder')}
            placeholderTextColor={c.textMuted}
            value={note}
            onChangeText={setNote}
            multiline
            maxLength={500}
          />

        </ScrollView>

        {/* Type picker overlay */}
        <Modal visible={pickingType} animationType="fade" transparent
          onRequestClose={() => setPickingType(false)}>
          <View style={s.typeBackdrop}>
            {/* tap-outside to dismiss */}
            <TouchableOpacity style={StyleSheet.absoluteFillObject}
              activeOpacity={1} onPress={() => setPickingType(false)} />
            <View style={[s.typeSheet, { backgroundColor: c.surfaceCard, borderColor: c.border }]}>
              {/* Scrollable predefined types */}
              <ScrollView showsVerticalScrollIndicator={false}
                style={{ maxHeight: 340 }}>
                {MILESTONE_TYPES.filter(t => t !== 'Custom').map((t) => {
                  const m = MILESTONE_META[t];
                  const selected = t === type;
                  return (
                    <TouchableOpacity
                      key={t}
                      style={[s.typeRow, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border }]}
                      onPress={() => { setType(t); setPickingType(false); }}
                    >
                      <View style={[s.typeIconSm, { backgroundColor: m.color + '20' }]}>
                        <Ionicons name={m.icon} size={18} color={m.color} />
                      </View>
                      <Text style={[s.typeRowTxt, { color: selected ? accent : c.textPrimary },
                        selected && { fontWeight: typography.bold }]}>{t}</Text>
                      {selected && <Ionicons name="checkmark" size={16} color={accent} />}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              {/* Custom — always pinned at bottom */}
              {(() => {
                const m = MILESTONE_META['Custom'];
                const selected = type === 'Custom';
                return (
                  <TouchableOpacity
                    style={[s.typeRow, s.typeCustomRow, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border }]}
                    onPress={() => { setType('Custom'); setPickingType(false); }}
                  >
                    <View style={[s.typeIconSm, { backgroundColor: m.color + '20' }]}>
                      <Ionicons name={m.icon} size={18} color={m.color} />
                    </View>
                    <Text style={[s.typeRowTxt, { color: selected ? accent : c.textPrimary },
                      selected && { fontWeight: typography.bold }]}>Custom</Text>
                    {selected && <Ionicons name="checkmark" size={16} color={accent} />}
                  </TouchableOpacity>
                );
              })()}
            </View>
          </View>
        </Modal>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function TimelineScreen() {
  const c = useColors();
  const accent = useAccentColor();
  const { t } = useTranslation();
  const { contentPaddingBottom } = useTabBarLayout();
  const { contentFrameStyle } = useResponsiveLayout();
  const { milestones, load, remove } = useTimelineStore();
  // null = closed, undefined = add mode, Milestone = edit mode
  const [modalMilestone, setModalMilestone] = useState<Milestone | null | undefined>(null);

  useEffect(() => { load(); }, [load]);

  const listStyle = [s.list, { paddingBottom: contentPaddingBottom }, contentFrameStyle];

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.surfacePrimary }]} edges={['top', 'left', 'right']}>

      {/* Header */}
      <View style={[s.header, { borderBottomColor: c.border }]}>
        <AppHeader title={t('timeline.title')} />
      </View>

      {milestones.length === 0 ? (
        <ScrollView contentContainerStyle={s.empty} showsVerticalScrollIndicator={false}>
          <View style={[s.emptyIcon, { backgroundColor: accent + '18' }]}>
            <Ionicons name="time-outline" size={36} color={accent} />
          </View>
          <Text style={[s.emptyTitle, { color: c.textPrimary }]}>{t('timeline.noMilestonesYet')}</Text>
          <Text style={[s.emptySub,   { color: c.textMuted }]}>{t('timeline.noMilestonesDesc')}</Text>

          {/* Example rows so users can see what they can add */}
          <Text style={[s.sampleHint, { color: c.textMuted }]}>{t('timeline.forExample')}</Text>
          <View style={s.sampleList}>
            {SAMPLE_MILESTONES.map(({ type, when }) => {
              const m = MILESTONE_META[type];
              return (
                <View key={type} style={[s.sampleCard, { borderColor: c.border, backgroundColor: c.surfaceCard }]}>
                  <View style={[s.cardIcon, { backgroundColor: m.color + '20' }]}>
                    <Ionicons name={m.icon} size={20} color={m.color} />
                  </View>
                  <Text style={[s.sampleLabel, { color: c.textSecondary }]}>{type}</Text>
                  <Text style={[s.sampleWhen, { color: c.textMuted }]}>{when}</Text>
                </View>
              );
            })}
          </View>

          <TouchableOpacity
            style={[s.emptyBtn, { backgroundColor: accent }]}
            onPress={() => setModalMilestone(undefined)}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={t('timeline.addFirstMilestone')}
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={s.addBtnTxt}>{t('timeline.addFirstMilestone')}</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={listStyle} showsVerticalScrollIndicator={false}>
          {milestones.map((item) => (
            <View key={item.id} style={s.cardCol}>
              <MilestoneCard item={item} onEdit={() => setModalMilestone(item)} onDelete={() => remove(item.id)} />
            </View>
          ))}
          <TouchableOpacity
            style={[s.bottomAdd, { borderColor: c.border, backgroundColor: c.surfaceCard }]}
            onPress={() => setModalMilestone(undefined)}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={t('timeline.addMilestone')}
          >
            <Ionicons name="add-circle-outline" size={18} color={accent} />
            <Text style={[s.bottomAddTxt, { color: accent }]}>{t('timeline.addMilestone')}</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      <AddMilestoneModal
        visible={modalMilestone !== null}
        editing={modalMilestone ?? undefined}
        onClose={() => setModalMilestone(null)}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1 },

  header:      { paddingHorizontal: spacing.base, borderBottomWidth: StyleSheet.hairlineWidth },
  addBtnTxt:   { color: '#fff', fontSize: typography.sm, fontWeight: typography.bold },

  list:        { paddingHorizontal: spacing.base, paddingTop: spacing.lg },
  modalKeyboard: { flex: 1 },
  timelineRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: 4 },
  lineCol:     { alignItems: 'center', width: 16 },
  dot:         { width: 10, height: 10, borderRadius: 5, marginTop: spacing.md + 6 },
  line:        { width: 2, flex: 1, marginTop: 4 },
  cardCol:     { flex: 1, paddingBottom: spacing.sm },

  card:      { flexDirection: 'row', alignItems: 'center', borderRadius: borderRadius.md,
               borderWidth: 0.3, padding: spacing.base, gap: spacing.md },
  cardEmoji: { fontSize: 20 },
  cardIcon:  { width: 40, height: 40, borderRadius: borderRadius.md,
               alignItems: 'center', justifyContent: 'center' },
  cardMid:   { flex: 1 },
  cardTitle: { fontSize: typography.base, fontWeight: typography.semibold },
  cardDate:  { fontSize: typography.xs, marginTop: 2 },
  cardNote:  { fontSize: typography.xs, marginTop: 3 },
  cardRight: { alignItems: 'flex-end' },
  daysVal:   { fontSize: typography.sm, fontWeight: typography.bold, lineHeight: 18 },
  daysSub:   { fontSize: typography.xs, marginTop: 1 },

  empty:      { flexGrow: 1, alignItems: 'center', justifyContent: 'center',
                paddingHorizontal: spacing['2xl'], paddingVertical: spacing['2xl'] },

  sampleHint: { fontSize: typography.xs, fontWeight: typography.semibold,
                letterSpacing: 1, marginBottom: spacing.sm, marginTop: spacing.xs },
  sampleList: { alignSelf: 'stretch', gap: spacing.sm, marginBottom: spacing.xl, opacity: 0.7 },
  sampleCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md,
                borderRadius: borderRadius.md, borderWidth: 0.3, borderStyle: 'dashed',
                paddingHorizontal: spacing.base, paddingVertical: spacing.md },
  sampleLabel:{ flex: 1, fontSize: typography.base, fontWeight: typography.medium },
  sampleWhen: { fontSize: typography.xs, fontStyle: 'italic' },
  emptyIcon:  { width: 72, height: 72, borderRadius: borderRadius.md,
                alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  emptyTitle: { fontSize: typography.xl, fontWeight: typography.bold, marginBottom: spacing.sm },
  emptySub:   { fontSize: typography.sm, textAlign: 'center', lineHeight: 22, marginBottom: spacing.xl },
  emptyBtn:   { flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
                paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
                borderRadius: borderRadius.full },

  bottomAdd:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                  gap: spacing.xs, borderRadius: borderRadius.md, borderWidth: 1,
                  paddingVertical: spacing.md, marginTop: spacing.sm },
  bottomAddTxt: { fontSize: typography.base, fontWeight: typography.semibold },

  deleteRow:  { flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
                paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
                borderBottomWidth: StyleSheet.hairlineWidth },
  deleteTxt:  { fontSize: typography.sm, fontWeight: typography.semibold },
  modal:       { flex: 1 },
  modalBar:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                 paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
                 borderBottomWidth: StyleSheet.hairlineWidth },
  modalBtn:    { paddingHorizontal: spacing.md, paddingVertical: 6,
                 borderRadius: borderRadius.md, borderWidth: 1, minWidth: 72, alignItems: 'center' },
  modalBtnTxt: { fontSize: typography.base },
  modalTitle:  { fontSize: typography.base, fontWeight: typography.semibold },
  modalBody:   { padding: spacing.base, paddingBottom: spacing['2xl'] },

  fieldLabel: { fontSize: typography.xs, fontWeight: typography.semibold,
                letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: spacing.xs },
  fieldRow:   { flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
                borderRadius: borderRadius.md, borderWidth: 0.3,
                paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  fieldVal:   { fontSize: typography.base },
  typeIcon:   { width: 32, height: 32, borderRadius: borderRadius.md,
                alignItems: 'center', justifyContent: 'center' },


  input:     { borderRadius: borderRadius.md, borderWidth: 0.3,
               paddingHorizontal: spacing.md, paddingVertical: spacing.md,
               fontSize: typography.base },
  noteInput: { borderRadius: borderRadius.md, borderWidth: 0.3,
               paddingHorizontal: spacing.md, paddingVertical: spacing.md,
               fontSize: typography.base, height: 100, textAlignVertical: 'top' },
  emojiPickerRow:   { flexDirection: 'row', alignItems: 'center', gap: spacing.md,
                      borderRadius: borderRadius.md, borderWidth: 0.3, padding: spacing.sm },
  emojiPickerInput: { width: 56, height: 56, borderRadius: borderRadius.md, borderWidth: 0.3,
                      fontSize: 30, textAlign: 'center' },
  emojiPickerHint:  { fontSize: typography.xs, flex: 1, lineHeight: 16 },

  typeBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
                  justifyContent: 'center', paddingHorizontal: spacing.base },
  typeSheet:    { borderRadius: borderRadius.md, borderWidth: 1, overflow: 'hidden' },
  typeCustomRow: {},
  typeRow:      { flexDirection: 'row', alignItems: 'center', gap: spacing.md,
                  paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  typeIconSm:   { width: 30, height: 30, borderRadius: borderRadius.md,
                  alignItems: 'center', justifyContent: 'center' },
  typeRowTxt:   { flex: 1, fontSize: typography.base },
});
