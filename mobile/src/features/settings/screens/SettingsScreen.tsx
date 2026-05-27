import React from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useProfile, useUpdateProfile } from '@/features/profile/hooks/useProfile';
import { Card } from '@/components/common/Card';
import { SkeletonCard } from '@/components/common/SkeletonCard';
import { palette, spacing, typography } from '@/theme';

function SettingRow({ label, description, value, onToggle }: {
  label: string;
  description: string;
  value: boolean;
  onToggle: (val: boolean) => void;
}) {
  return (
    <View style={styles.settingRow} accessibilityRole="switch" accessibilityState={{ checked: value }}>
      <View style={styles.settingText}>
        <Text style={styles.settingLabel}>{label}</Text>
        <Text style={styles.settingDesc}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: palette.surfaceTertiary, true: palette.blue }}
        thumbColor={palette.white}
      />
    </View>
  );
}

export default function SettingsScreen() {
  const { data: profile, isLoading } = useProfile();
  const { mutate: updateProfile } = useUpdateProfile();

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
        </View>
        <View style={styles.skeletons}><SkeletonCard /><SkeletonCard /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Notifications</Text>

        <SettingRow
          label="Draw Notifications"
          description="Get notified when a new draw is published"
          value={profile?.notifications_enabled ?? true}
          onToggle={(val) => updateProfile({ notifications_enabled: val })}
        />

        <View style={styles.divider} />

        <SettingRow
          label="Weekly Summary"
          description="Receive a weekly summary of your CRS standing"
          value={profile?.weekly_summary_enabled ?? true}
          onToggle={(val) => updateProfile({ weekly_summary_enabled: val })}
        />
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.aboutText}>
          CRS Pulse tracks Canadian Express Entry draws and helps you understand your chances.
        </Text>
        <Text style={styles.version}>Version 1.0.0</Text>
      </Card>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.surfacePrimary },
  header: { paddingHorizontal: spacing.base, paddingTop: spacing.base, paddingBottom: spacing.sm },
  title: { color: palette.white, fontSize: typography['3xl'], fontWeight: typography.bold },
  skeletons: { padding: spacing.base, gap: spacing.sm },
  card: { margin: spacing.base, marginTop: 0, gap: spacing.base },
  sectionTitle: { color: palette.white, fontSize: typography.lg, fontWeight: typography.semibold },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  settingText: { flex: 1, marginRight: spacing.base },
  settingLabel: { color: palette.white, fontSize: typography.base, fontWeight: typography.medium },
  settingDesc: { color: palette.textSecondary, fontSize: typography.sm, marginTop: 2 },
  divider: { height: 1, backgroundColor: palette.surfaceTertiary },
  aboutText: { color: palette.textSecondary, fontSize: typography.sm, lineHeight: 20 },
  version: { color: palette.textMuted, fontSize: typography.xs },
});
