import { useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, typography, borderRadius } from '@/theme';
import { useColors } from '@/hooks/useColors';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useApplicationStore } from '@/store/applicationStore';
import {
  APPLICATION_CATEGORIES,
  PROCESSING_TIMES_UPDATED,
  type ApplicationCategory,
} from '../data/processingTimes';

const STEPS = 3;

export default function ApplicationSetupScreen() {
  const c = useColors();
  const accent = useAccentColor();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { application, save } = useApplicationStore();

  const [step, setStep] = useState(0);
  const [categoryId, setCategoryId] = useState<string | null>(application?.categoryId ?? null);
  const [typeId, setTypeId] = useState<string | null>(application?.typeId ?? null);
  const [date, setDate] = useState<Date>(
    application?.appliedDate ? new Date(application.appliedDate) : new Date(),
  );
  const [showPicker, setShowPicker] = useState(Platform.OS === 'ios');

  const category: ApplicationCategory | undefined =
    APPLICATION_CATEGORIES.find((cat) => cat.id === categoryId);

  const canNext = step === 0 ? !!categoryId : step === 1 ? !!typeId : true;

  const finish = (appliedDate: string | null) => {
    if (!categoryId || !typeId) return;
    save({ categoryId, typeId, appliedDate });
    navigation.goBack();
  };

  const next = () => {
    if (step < STEPS - 1) {
      setStep(step + 1);
    } else {
      finish(date.toISOString().slice(0, 10));
    }
  };

  const back = () => {
    if (step === 0) {
      navigation.goBack();
    } else {
      setStep(step - 1);
    }
  };

  const onDateChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setShowPicker(false);
    if (event.type !== 'dismissed' && selected) setDate(selected);
  };

  const progress = ((step + 1) / STEPS) * 100;

  const renderChoice = (
    items: { id: string; label: string; icon?: string; sub?: string }[],
    selected: string | null,
    onSelect: (id: string) => void,
  ) =>
    items.map((item) => {
      const active = selected === item.id;
      return (
        <TouchableOpacity
          key={item.id}
          style={[
            s.choice,
            { borderColor: c.border, backgroundColor: c.surfaceCard },
            active && { borderColor: accent, backgroundColor: accent + '12' },
          ]}
          onPress={() => onSelect(item.id)}
          activeOpacity={0.65}
        >
          {item.icon && (
            <View style={[s.choiceIcon, { backgroundColor: accent + '15' }]}>
              <Ionicons name={item.icon as any} size={18} color={accent} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={[s.choiceLabel, { color: c.textPrimary }]}>{item.label}</Text>
            {item.sub && <Text style={[s.choiceSub, { color: c.textMuted }]}>{item.sub}</Text>}
          </View>
          <Ionicons
            name={active ? 'radio-button-on' : 'radio-button-off'}
            size={18}
            color={active ? accent : c.textMuted}
          />
        </TouchableOpacity>
      );
    });

  return (
    <View style={[s.wrap, { backgroundColor: c.surfacePrimary }]}>
      {/* Top bar */}
      <View style={[s.topBar, { paddingTop: insets.top + spacing.sm, borderBottomColor: c.border }]}>
        <TouchableOpacity onPress={back} hitSlop={16} style={s.backBtn}>
          <Ionicons name="chevron-back" size={22} color={c.textPrimary} />
          <Text style={[s.backLabel, { color: c.textPrimary }]}>Back</Text>
        </TouchableOpacity>
        <Text style={[s.title, { color: c.textPrimary }]}>Track Application</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Progress */}
      <View style={s.progressWrap}>
        <View style={s.progressLabels}>
          <Text style={[s.progressText, { color: c.textSecondary }]}>Step {step + 1} of {STEPS}</Text>
          <Text style={[s.progressText, { color: c.textMuted }]}>{Math.round(progress)}%</Text>
        </View>
        <View style={[s.progressTrack, { backgroundColor: c.surfaceTertiary }]}>
          <View style={[s.progressFill, { backgroundColor: accent, width: `${progress}%` }]} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[s.body, { paddingBottom: insets.bottom + spacing['2xl'] }]}
        showsVerticalScrollIndicator={false}
      >
        {step === 0 && (
          <>
            <Text style={[s.question, { color: c.textPrimary }]}>
              What kind of application did you submit?
            </Text>
            {renderChoice(
              APPLICATION_CATEGORIES.map((cat) => ({ id: cat.id, label: cat.label, icon: cat.icon })),
              categoryId,
              (id) => { setCategoryId(id); if (id !== categoryId) setTypeId(null); },
            )}
          </>
        )}

        {step === 1 && category && (
          <>
            <Text style={[s.question, { color: c.textPrimary }]}>
              Which {category.label.toLowerCase()} program?
            </Text>
            {renderChoice(
              category.types.map((t) => ({
                id: t.id,
                label: t.label,
                sub: `Typical processing: ~${t.months} ${t.months === 1 ? 'month' : 'months'}${t.varies ? ' (varies by country)' : ''}`,
              })),
              typeId,
              setTypeId,
            )}
          </>
        )}

        {step === 2 && (
          <>
            <Text style={[s.question, { color: c.textPrimary }]}>When did you apply?</Text>
            {Platform.OS === 'android' && (
              <TouchableOpacity
                style={[s.dateBtn, { borderColor: c.border, backgroundColor: c.surfaceCard }]}
                onPress={() => setShowPicker(true)}
                activeOpacity={0.65}
              >
                <Ionicons name="calendar-outline" size={18} color={accent} />
                <Text style={[s.dateText, { color: c.textPrimary }]}>
                  {date.toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })}
                </Text>
              </TouchableOpacity>
            )}
            {showPicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                maximumDate={new Date()}
                onChange={onDateChange}
              />
            )}
            <TouchableOpacity
              style={[s.notAppliedBtn, { borderColor: c.border, backgroundColor: c.surfaceSecondary }]}
              onPress={() => finish(null)}
              activeOpacity={0.65}
            >
              <Ionicons name="calendar-clear-outline" size={16} color={c.textSecondary} />
              <Text style={[s.notAppliedText, { color: c.textSecondary }]}>
                I haven't applied yet
              </Text>
            </TouchableOpacity>
          </>
        )}

        <Text style={[s.disclaimer, { color: c.textMuted }]}>
          Estimates based on IRCC published processing times (updated {PROCESSING_TIMES_UPDATED}).
          Actual times vary by case — check your account on canada.ca for official status.
        </Text>
      </ScrollView>

      {/* Footer CTA */}
      <View style={[s.footer, { paddingBottom: insets.bottom + spacing.base, borderTopColor: c.border }]}>
        <TouchableOpacity
          style={[s.cta, { backgroundColor: canNext ? accent : c.surfaceTertiary }]}
          onPress={next}
          disabled={!canNext}
          activeOpacity={0.8}
        >
          <Text style={[s.ctaText, { color: canNext ? '#fff' : c.textMuted }]}>
            {step === STEPS - 1 ? 'Start Tracking' : 'Next'}
          </Text>
          <Ionicons
            name={step === STEPS - 1 ? 'checkmark' : 'arrow-forward'}
            size={18}
            color={canNext ? '#fff' : c.textMuted}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap:      { flex: 1 },
  topBar:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
               paddingHorizontal: spacing.base, paddingBottom: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn:   { flexDirection: 'row', alignItems: 'center', gap: 2, width: 60 },
  backLabel: { fontSize: typography.base, fontWeight: typography.medium },
  title:     { fontSize: typography.base, fontWeight: typography.semibold, flex: 1, textAlign: 'center' },

  progressWrap:   { paddingHorizontal: spacing.base, paddingTop: spacing.md, gap: spacing.xs },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  progressText:   { fontSize: typography.sm, fontWeight: typography.medium },
  progressTrack:  { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill:   { height: '100%', borderRadius: 3 },

  body:     { padding: spacing.base, paddingTop: spacing.lg, gap: spacing.sm },
  question: { fontSize: typography.xl, fontWeight: typography.black, letterSpacing: -0.3,
              textAlign: 'center', marginBottom: spacing.sm },

  choice: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    borderWidth: 1, borderRadius: borderRadius.md, padding: spacing.md,
  },
  choiceIcon: {
    width: 36, height: 36, borderRadius: borderRadius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  choiceLabel: { fontSize: typography.sm, fontWeight: typography.semibold, lineHeight: 19 },
  choiceSub:   { fontSize: typography.xs, marginTop: 2 },

  dateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    borderWidth: 1, borderRadius: borderRadius.md, padding: spacing.md,
  },
  dateText: { fontSize: typography.base, fontWeight: typography.semibold },

  notAppliedBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
    borderWidth: StyleSheet.hairlineWidth, borderRadius: borderRadius.md,
    paddingVertical: spacing.sm + 2, marginTop: spacing.xs,
  },
  notAppliedText: { fontSize: typography.sm, fontWeight: typography.semibold },

  disclaimer: { fontSize: typography.xs, lineHeight: 18, textAlign: 'center', marginTop: spacing.md },

  footer: { paddingHorizontal: spacing.base, paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth },
  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
    paddingVertical: spacing.md, borderRadius: borderRadius.md,
  },
  ctaText: { fontSize: typography.base, fontWeight: typography.bold },
});
