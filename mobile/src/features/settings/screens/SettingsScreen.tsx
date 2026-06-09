import React from 'react';
import { StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useProfile, useUpdateProfile } from '@/features/profile/hooks/useProfile';
import { Card } from '@/components/common/Card';
import { SkeletonCard } from '@/components/common/SkeletonCard';
import { palette, spacing, typography } from '@/theme';
import { useColors } from '@/hooks/useColors';
import { useAccentColor } from '@/hooks/useAccentColor';

const ACCENT_COLORS = [
  { value: '#1A6DFF', label: 'Blue'       },
  { value: '#E8603C', label: 'Terracotta' },
  { value: '#00C875', label: 'Green'      },
  { value: '#9B59B6', label: 'Purple'     },
  { value: '#E74C3C', label: 'Red'        },
  { value: '#F39C12', label: 'Amber'      },
  { value: '#00BCD4', label: 'Teal'       },
  { value: '#E91E63', label: 'Pink'       },
];

function SettingRow({ label, description, value, onToggle, accent }: {
  label: string;
  description: string;
  value: boolean;
  onToggle: (val: boolean) => void;
  accent: string;
}) {
  const colors = useColors();
  return (
    <View style={[rowStyles.row]} accessibilityRole="switch" accessibilityState={{ checked: value }}>
      <View style={rowStyles.text}>
        <Text style={[rowStyles.label, { color: colors.textPrimary }]}>{label}</Text>
        <Text style={[rowStyles.desc, { color: colors.textSecondary }]}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: colors.border, true: accent }}
        thumbColor={palette.white}
      />
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  text:  { flex: 1, marginRight: spacing.base },
  label: { fontSize: typography.base, fontWeight: typography.medium },
  desc:  { fontSize: typography.sm, marginTop: 2 },
});

export default function SettingsScreen() {
  const colors = useColors();
  const accent = useAccentColor();
  const { data: profile, isLoading } = useProfile();
  const { mutate: updateProfile } = useUpdateProfile();

  const styles = makeStyles();

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.surfacePrimary }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Settings</Text>
        </View>
        <View style={styles.skeletons}><SkeletonCard /><SkeletonCard /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.surfacePrimary }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Settings</Text>
      </View>

      <Card style={styles.card}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Notifications</Text>

        <SettingRow
          accent={accent}
          label="Draw Notifications"
          description="Get notified when a new draw is published"
          value={profile?.notifications_enabled ?? true}
          onToggle={(val) => updateProfile({ notifications_enabled: val })}
        />

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <SettingRow
          accent={accent}
          label="Weekly Summary"
          description="Receive a weekly summary of your CRS standing"
          value={profile?.weekly_summary_enabled ?? true}
          onToggle={(val) => updateProfile({ weekly_summary_enabled: val })}
        />
      </Card>

      <Card style={styles.card}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Appearance</Text>
        <Text style={[styles.colorLabel, { color: colors.textSecondary }]}>Theme Color</Text>
        <View style={styles.swatchRow}>
          {ACCENT_COLORS.map((c) => {
            const selected = (profile?.accent_color ?? '#1A6DFF') === c.value;
            return (
              <TouchableOpacity
                key={c.value}
                onPress={() => updateProfile({ accent_color: c.value })}
                accessibilityLabel={c.label}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                style={[styles.swatch, { backgroundColor: c.value, borderColor: selected ? colors.textPrimary : 'transparent' }]}
              >
                {selected && (
                  <Ionicons name="checkmark" size={14} color={palette.white} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </Card>

      <Card style={styles.card}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>About</Text>
        <Text style={[styles.aboutText, { color: colors.textSecondary }]}>
          CRS Pulse tracks Canadian Express Entry draws and helps you understand your chances.
        </Text>
        <Text style={[styles.version, { color: colors.textMuted }]}>Version 1.0.0</Text>
      </Card>
    </SafeAreaView>
  );
}

function makeStyles() {
  return StyleSheet.create({
    safe:        { flex: 1 },
    header:      { paddingHorizontal: spacing.base, paddingTop: spacing.base, paddingBottom: spacing.sm },
    title:       { fontSize: typography['3xl'], fontWeight: typography.bold },
    skeletons:   { padding: spacing.base, gap: spacing.sm },
    card:        { margin: spacing.base, marginTop: 0, gap: spacing.base },
    sectionTitle:{ fontSize: typography.lg, fontWeight: typography.semibold },
    divider:     { height: 1 },
    aboutText:   { fontSize: typography.sm, lineHeight: 20 },
    version:     { fontSize: typography.xs },
    colorLabel:  { fontSize: typography.sm },
    swatchRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    swatch:      {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 2.5,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
