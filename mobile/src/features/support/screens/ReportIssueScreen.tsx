import { Linking, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { spacing, typography, borderRadius } from '@/theme';
import { useColors } from '@/hooks/useColors';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { useAccentColor } from '@/hooks/useAccentColor';
import { AppHeader } from '@/components/layout/AppHeader';

const SUPPORT_EMAIL = 'support@crspulse.com';

function buildMailUrl() {
  const version = Constants.expoConfig?.version ?? 'unknown';
  const subject = encodeURIComponent(`CRS Pulse ${version} — issue report`);
  const body = encodeURIComponent(
    `Describe the issue:\n\n\n` +
    `What did you expect to happen?\n\n\n` +
    `—\nApp version: ${version}\nDevice: ${Platform.OS} ${Platform.Version}\n`,
  );
  return `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
}

export default function ReportIssueScreen() {
  const c = useColors();
  const accent = useAccentColor();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { contentFrameStyle } = useResponsiveLayout();

  const actions = [
    {
      icon: 'mail-outline' as const,
      title: t('support.emailTitle'),
      sub: t('support.emailSub', { email: SUPPORT_EMAIL }),
      onPress: () => Linking.openURL(buildMailUrl()).catch(() => {}),
    },
  ];

  return (
    <View style={[s.wrap, { backgroundColor: c.surfacePrimary }]}>
      <AppHeader title={t('support.title')} variant="stack" />

      <ScrollView
        contentContainerStyle={[s.body, contentFrameStyle, { paddingBottom: insets.bottom + spacing['2xl'] }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[s.intro, { color: c.textSecondary }]}>
          {t('support.intro')}
        </Text>

        {actions.map((a) => (
          <TouchableOpacity
            key={a.title}
            style={[s.card, { borderColor: c.border, backgroundColor: c.surfaceCard }]}
            onPress={a.onPress}
            activeOpacity={0.55}
          >
            <View style={[s.iconBox, { backgroundColor: accent + '1A' }]}>
              <Ionicons name={a.icon} size={20} color={accent} />
            </View>
            <View style={s.cardText}>
              <Text style={[s.cardTitle, { color: c.textPrimary }]}>{a.title}</Text>
              <Text style={[s.cardSub, { color: c.textMuted }]}>{a.sub}</Text>
            </View>
            <Ionicons name="chevron-forward" size={15} color={c.textMuted} />
          </TouchableOpacity>
        ))}

        <Text style={[s.note, { color: c.textMuted }]}>
          {t('support.note')}
        </Text>
      </ScrollView>
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
  body:      { padding: spacing.base, paddingTop: spacing.lg, gap: spacing.md },
  intro:     { fontSize: typography.base, lineHeight: 24 },
  card:      { flexDirection: 'row', alignItems: 'center', gap: spacing.md,
               borderWidth: StyleSheet.hairlineWidth, borderRadius: borderRadius.md,
               paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  iconBox:   { width: 38, height: 38, borderRadius: borderRadius.md,
               alignItems: 'center', justifyContent: 'center' },
  cardText:  { flex: 1, gap: 2 },
  cardTitle: { fontSize: typography.base, fontWeight: typography.semibold },
  cardSub:   { fontSize: typography.sm, lineHeight: 18 },
  note:      { fontSize: typography.sm, textAlign: 'center', marginTop: spacing.sm },
});
