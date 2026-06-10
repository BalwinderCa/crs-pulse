import React, { useEffect, useState } from 'react';
import {
  Alert, Modal, Platform, ScrollView, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format, differenceInDays, parseISO } from 'date-fns';
import { palette, spacing, typography, borderRadius } from '@/theme';
import { useColors } from '@/hooks/useColors';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useTimelineStore, type Milestone, type MilestoneType } from '@/store/timelineStore';

// ─── Milestone metadata ───────────────────────────────────────────────────────

type Meta = { icon: React.ComponentProps<typeof Ionicons>['name']; color: string };

const MILESTONE_META: Record<MilestoneType, Meta> = {
  'ITA':                   { icon: 'mail-open-outline',        color: '#5B9EFF' },
  'Application Submitted': { icon: 'document-text-outline',    color: '#00E5A0' },
  'AOR Received':          { icon: 'checkmark-circle-outline', color: '#00E5A0' },
  'Biometrics Requested':  { icon: 'finger-print-outline',     color: '#FFB547' },
  'Biometrics Completed':  { icon: 'shield-checkmark-outline', color: '#00E5A0' },
  'Medical Requested':     { icon: 'medkit-outline',           color: '#FFB547' },
  'Medical Passed':        { icon: 'heart-outline',            color: '#00E5A0' },
  'Passport Requested':    { icon: 'id-card-outline',          color: '#FFB547' },
  'Passport Submitted':    { icon: 'send-outline',             color: '#5B9EFF' },
  'Passport Collected':    { icon: 'ribbon-outline',           color: '#00E5A0' },
  'ADR':                   { icon: 'alert-circle-outline',     color: '#FF8C42' },
  'Portal 1':              { icon: 'log-in-outline',           color: '#A78BFA' },
  'Portal 2':              { icon: 'log-in-outline',           color: '#7C3AED' },
  'Final Decision':        { icon: 'trophy-outline',           color: '#FF6B6B' },
  'Custom':                { icon: 'create-outline',           color: palette.gray300 },
};

const MILESTONE_TYPES: MilestoneType[] = [
  'ITA', 'Application Submitted', 'AOR Received',
  'Biometrics Requested', 'Biometrics Completed',
  'Medical Requested', 'Medical Passed',
  'Passport Requested', 'Passport Submitted', 'Passport Collected',
  'ADR', 'Portal 1', 'Portal 2',
  'Final Decision', 'Custom',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysLabel(dateStr: string): { value: string; sub: string; future: boolean } {
  const diff = differenceInDays(new Date(), parseISO(dateStr));
  if (diff === 0) return { value: 'Today', sub: '', future: false };
  if (diff > 0)  return { value: String(diff), sub: diff === 1 ? 'day ago' : 'days ago', future: false };
  return { value: String(Math.abs(diff)), sub: 'days left', future: true };
}


// ─── Milestone card ───────────────────────────────────────────────────────────

function MilestoneCard({ item, onEdit }: { item: Milestone; onEdit: () => void; onDelete: () => void }) {
  const c = useColors();
  const meta = MILESTONE_META[item.type];
  const label = item.type === 'Custom' && item.customLabel ? item.customLabel : item.type;
  const dl = daysLabel(item.date);

  return (
    <TouchableOpacity
      style={[s.card, { backgroundColor: c.surfaceCard, borderColor: c.border }]}
      onPress={onEdit}
      activeOpacity={0.8}
    >
      <View style={[s.cardIcon, { backgroundColor: meta.color + '20' }]}>
        {item.type === 'Custom' && item.customEmoji
          ? <Text style={s.cardEmoji}>{item.customEmoji}</Text>
          : <Ionicons name={meta.icon} size={20} color={meta.color} />}
      </View>
      <View style={s.cardMid}>
        <Text style={[s.cardTitle, { color: c.textPrimary }]}>{label}</Text>
        <Text style={[s.cardDate,  { color: c.textMuted }]}>
          {format(parseISO(item.date), 'MMM d, yyyy')}
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

  // Pre-fill when editing
  useEffect(() => {
    if (editing) {
      setType(editing.type);
      setCustomLabel(editing.customLabel ?? '');
      setCustomEmoji(editing.customEmoji ?? '');
      setDate(parseISO(editing.date));
      setNote(editing.note ?? '');
    } else {
      reset();
    }
  }, [editing, visible]);

  function reset() {
    setType('ITA'); setCustomLabel(''); setCustomEmoji(''); setNote('');
    setDate(new Date()); setShowPicker(false); setPickingType(false);
  }

  async function handleSave() {
    if (type === 'Custom' && !customLabel.trim()) {
      Alert.alert('Label required', 'Please enter a label for your custom milestone.');
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
    Alert.alert('Delete milestone', 'Remove this milestone?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await remove(editing.id); reset(); onClose(); } },
    ]);
  }

  const meta = MILESTONE_META[type];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet"
      onRequestClose={() => { reset(); onClose(); }}>
      <SafeAreaView style={[s.modal, { backgroundColor: c.surfacePrimary }]} edges={['top']}>

        {/* Top bar */}
        <View style={[s.modalBar, { borderBottomColor: c.border }]}>
          <TouchableOpacity onPress={() => { reset(); onClose(); }} style={[s.modalBtn, { borderColor: c.border }]}>
            <Text style={[s.modalBtnTxt, { color: c.textMuted }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[s.modalTitle, { color: c.textPrimary }]}>{editing ? 'Edit Milestone' : 'Add Milestone'}</Text>
          <TouchableOpacity onPress={handleSave} style={[s.modalBtn, { borderColor: accent }]}>
            <Text style={[s.modalBtnTxt, { color: accent, fontWeight: typography.bold }]}>Save</Text>
          </TouchableOpacity>
        </View>

        {/* Delete row — only in edit mode */}
        {editing && (
          <TouchableOpacity
            style={[s.deleteRow, { borderBottomColor: c.border }]}
            onPress={handleDelete}
          >
            <Ionicons name="trash-outline" size={16} color={palette.danger} />
            <Text style={[s.deleteTxt, { color: palette.danger }]}>Delete Milestone</Text>
          </TouchableOpacity>
        )}

        <ScrollView contentContainerStyle={s.modalBody} showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">

          {/* Type */}
          <Text style={[s.fieldLabel, { color: c.textMuted }]}>TYPE</Text>
          <TouchableOpacity
            style={[s.fieldRow, { backgroundColor: c.surfaceCard, borderColor: c.border }]}
            onPress={() => setPickingType(true)}
          >
            <View style={[s.typeIcon, { backgroundColor: meta.color + '20' }]}>
              <Ionicons name={meta.icon} size={18} color={meta.color} />
            </View>
            <Text style={[s.fieldVal, { color: c.textPrimary, flex: 1 }]}>
              {type === 'Custom' && customLabel ? customLabel : type}
            </Text>
            <Ionicons name="chevron-down" size={16} color={c.textMuted} />
          </TouchableOpacity>

          {/* Custom label + emoji */}
          {type === 'Custom' && (
            <>
              <Text style={[s.fieldLabel, { color: c.textMuted, marginTop: spacing.lg }]}>LABEL</Text>
              <TextInput
                style={[s.input, { backgroundColor: c.surfaceCard, borderColor: c.border, color: c.textPrimary }]}
                placeholder="e.g. Background Check"
                placeholderTextColor={c.textMuted}
                value={customLabel}
                onChangeText={setCustomLabel}
              />
              <Text style={[s.fieldLabel, { color: c.textMuted, marginTop: spacing.lg }]}>EMOJI (OPTIONAL)</Text>
              <View style={[s.emojiPickerRow, { backgroundColor: c.surfaceCard, borderColor: c.border }]}>
                <TextInput
                  style={[s.emojiPickerInput, { color: c.textPrimary, borderColor: customEmoji ? accent : c.border }]}
                  value={customEmoji}
                  onChangeText={t => {
                    // keep only the last grapheme cluster (one emoji)
                    const chars = [...t];
                    setCustomEmoji(chars[chars.length - 1] ?? '');
                  }}
                  placeholder="😀"
                  placeholderTextColor={c.textMuted}
                  maxLength={8}
                  keyboardType="default"
                />
                <Text style={[s.emojiPickerHint, { color: c.textMuted }]}>
                  Tap the field, then press{'\n'}the globe 🌐 on the keyboard{'\n'}to pick an emoji
                </Text>
              </View>
            </>
          )}

          {/* Date */}
          <Text style={[s.fieldLabel, { color: c.textMuted, marginTop: spacing.lg }]}>DATE</Text>
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

          {/* iOS: inline spinner below the row */}
          {showPicker && Platform.OS === 'ios' && (
            <DateTimePicker
              value={date}
              mode="date"
              display="spinner"
              onChange={(_e, d) => { if (d) setDate(d); }}
              themeVariant="light"
            />
          )}

          {/* Android: native modal dialog */}
          {showPicker && Platform.OS === 'android' && (
            <DateTimePicker
              value={date}
              mode="date"
              display="default"
              onChange={(_e, d) => { setShowPicker(false); if (d) setDate(d); }}
            />
          )}

          {/* Note */}
          <Text style={[s.fieldLabel, { color: c.textMuted, marginTop: spacing.lg }]}>NOTE (OPTIONAL)</Text>
          <TextInput
            style={[s.noteInput, { backgroundColor: c.surfaceCard, borderColor: c.border, color: c.textPrimary }]}
            placeholder="Add a note..."
            placeholderTextColor={c.textMuted}
            value={note}
            onChangeText={setNote}
            multiline
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
                        <Ionicons name={m.icon} size={16} color={m.color} />
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
                      <Ionicons name={m.icon} size={16} color={m.color} />
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

      </SafeAreaView>
    </Modal>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function TimelineScreen() {
  const c = useColors();
  const accent = useAccentColor();
  const { milestones, load, remove } = useTimelineStore();
  // null = closed, undefined = add mode, Milestone = edit mode
  const [modalMilestone, setModalMilestone] = useState<Milestone | null | undefined>(null);

  useEffect(() => { load(); }, []);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.surfacePrimary }]}>

      {/* Header */}
      <View style={[s.header, { borderBottomColor: c.border }]}>
        <View>
          <Text style={[s.headerSub,   { color: c.textMuted }]}>Express Entry</Text>
          <Text style={[s.headerTitle, { color: c.textPrimary }]}>My Timeline</Text>
        </View>
        <TouchableOpacity
          style={[s.addBtn, { backgroundColor: accent }]}
          onPress={() => setModalMilestone(undefined)}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Add milestone"
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={s.addBtnTxt}>Add</Text>
        </TouchableOpacity>
      </View>

      {milestones.length === 0 ? (
        <View style={s.empty}>
          <View style={[s.emptyIcon, { backgroundColor: accent + '18' }]}>
            <Ionicons name="time-outline" size={36} color={accent} />
          </View>
          <Text style={[s.emptyTitle, { color: c.textPrimary }]}>No milestones yet</Text>
          <Text style={[s.emptySub,   { color: c.textMuted }]}>
            Track your immigration journey by adding your first milestone.
          </Text>
          <TouchableOpacity
            style={[s.emptyBtn, { backgroundColor: accent }]}
            onPress={() => setModalMilestone(undefined)}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Add milestone"
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={s.addBtnTxt}>Add Milestone</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
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
            accessibilityLabel="Add milestone"
          >
            <Ionicons name="add-circle-outline" size={18} color={accent} />
            <Text style={[s.bottomAddTxt, { color: accent }]}>Add Milestone</Text>
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

  header:      { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
                 paddingHorizontal: spacing.base, paddingTop: spacing.base,
                 paddingBottom: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  headerSub:   { fontSize: typography.xs, fontWeight: typography.semibold,
                 letterSpacing: 0.8, textTransform: 'uppercase' },
  headerTitle: { fontSize: typography['3xl'], fontWeight: typography.black, letterSpacing: -0.5 },
  addBtn:      { flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
                 paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
                 borderRadius: borderRadius.full },
  addBtnTxt:   { color: '#fff', fontSize: typography.sm, fontWeight: typography.bold },

  list:        { paddingHorizontal: spacing.base, paddingTop: spacing.lg, paddingBottom: 100 },
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

  empty:      { flex: 1, alignItems: 'center', justifyContent: 'center',
                paddingHorizontal: spacing['2xl'] },
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
