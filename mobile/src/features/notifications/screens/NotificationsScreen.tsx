import { Fragment, useEffect } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/layout/AppHeader';
import { UpgradeBanner } from '@/components/common/UpgradeBanner';
import { AdBanner } from '@/components/common/AdBanner';
import { useDrawsStore } from '@/store/drawsStore';
import { useNotificationsStore } from '../store/notificationsStore';
import { useDrawNotifications } from '@/hooks/useDrawNotifications';
import { CATEGORY_LABELS } from '@/constants';
import { palette, spacing, typography, borderRadius } from '@/theme';
import { useColors } from '@/hooks/useColors';
import { useAccentColor } from '@/hooks/useAccentColor';

const MAX_ITEMS = 15;

function timeAgo(dateStr: string): string {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? '1 month ago' : `${months} months ago`;
}

export default function NotificationsScreen() {
  const c = useColors();
  const accent = useAccentColor();
  const insets = useSafeAreaInsets();
  const { draws } = useDrawsStore();
  const { seenDraw, markSeen } = useNotificationsStore();
  const { enabled: alertsEnabled, toggle: toggleAlerts } = useDrawNotifications();

  const items = draws.slice(0, MAX_ITEMS);
  const latest = draws[0];

  useEffect(() => {
    if (latest && latest.draw_number !== seenDraw) {
      markSeen(latest.draw_number);
    }
  }, [latest, seenDraw, markSeen]);

  return (
    <View style={[s.wrap, { backgroundColor: c.surfacePrimary }]}>
      <AppHeader title="Notifications" variant="stack" />

      <ScrollView
        contentContainerStyle={[s.body, { paddingBottom: insets.bottom + spacing['2xl'] }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Upgrade banner for free users */}
        <UpgradeBanner />

        {/* Push alerts toggle */}
        <View style={[s.card, { borderColor: c.border, backgroundColor: c.surfaceCard }]}>
          <View style={s.toggleRow}>
            <View style={[s.bellBox, { backgroundColor: accent + '18' }]}>
              <Ionicons name="notifications-outline" size={20} color={accent} />
            </View>
            <View style={s.toggleText}>
              <Text style={[s.toggleLabel, { color: c.textPrimary }]}>New Draw Alerts</Text>
              <Text style={[s.toggleHint, { color: c.textMuted }]}>
                {alertsEnabled
                  ? 'Push alerts on — you will be notified of new draws'
                  : 'Turn on to get notified the moment IRCC publishes a draw'}
              </Text>
            </View>
            <Switch
              value={alertsEnabled}
              onValueChange={toggleAlerts}
              trackColor={{ false: c.surfaceTertiary, true: accent }}
              thumbColor={palette.white}
            />
          </View>
        </View>

        <Text style={[s.sectionTitle, { color: c.textMuted }]}>RECENT DRAW ALERTS</Text>

        {items.length === 0 ? (
          <Text style={[s.empty, { color: c.textMuted }]}>
            No draws yet — alerts will appear here when IRCC publishes rounds of invitations.
          </Text>
        ) : (
          items.map((draw, index) => (
            <Fragment key={draw.draw_number}>
              <View style={[s.item, { borderColor: c.border, backgroundColor: c.surfaceCard }]}>
                <View style={[s.itemIcon, { backgroundColor: accent + '14' }]}>
                  <Ionicons name="flash-outline" size={17} color={accent} />
                </View>
                <View style={s.itemText}>
                  <Text style={[s.itemTitle, { color: c.textPrimary }]}>
                    New Express Entry Draw #{draw.draw_number}
                  </Text>
                  <Text style={[s.itemBody, { color: c.textSecondary }]}>
                    {CATEGORY_LABELS[draw.category] ?? draw.category} — Cutoff:{' '}
                    {draw.cutoff_score} points · {draw.invitations_issued.toLocaleString()} invitations
                  </Text>
                  <Text style={[s.itemTime, { color: c.textMuted }]}>{timeAgo(draw.date)}</Text>
                </View>
              </View>
              {(index + 1) % 5 === 0 && <AdBanner />}
            </Fragment>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1 },
  body: { padding: spacing.base, paddingTop: spacing.lg, gap: spacing.sm },

  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: borderRadius.md, padding: spacing.md },
  toggleRow:   { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  bellBox:     { width: 40, height: 40, borderRadius: borderRadius.md,
                 alignItems: 'center', justifyContent: 'center' },
  toggleText:  { flex: 1, gap: 2 },
  toggleLabel: { fontSize: typography.base, fontWeight: typography.bold },
  toggleHint:  { fontSize: typography.xs, lineHeight: 16 },

  sectionTitle: { fontSize: typography.xs, fontWeight: typography.bold,
                  letterSpacing: 0.8, marginTop: spacing.sm },
  empty: { fontSize: typography.sm, lineHeight: 20, textAlign: 'center', marginTop: spacing.lg },

  item: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md,
    borderWidth: StyleSheet.hairlineWidth, borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  itemIcon: { width: 34, height: 34, borderRadius: borderRadius.md,
              alignItems: 'center', justifyContent: 'center' },
  itemText:  { flex: 1, gap: 2 },
  itemTitle: { fontSize: typography.sm, fontWeight: typography.bold },
  itemBody:  { fontSize: typography.sm, lineHeight: 19 },
  itemTime:  { fontSize: typography.xs, marginTop: 2 },
});
