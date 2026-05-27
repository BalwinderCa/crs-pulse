import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useProfile, useUpdateProfile } from '../hooks/useProfile';
import { useLogout } from '@/features/auth/hooks/useAuth';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { SkeletonCard } from '@/components/common/SkeletonCard';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { CATEGORIES, CATEGORY_LABELS, CRS_MAX, CRS_MIN } from '@/constants';
import { palette, spacing, typography } from '@/theme';

const schema = z.object({
  crs_score: z
    .number({ invalid_type_error: 'CRS score must be a number' })
    .min(CRS_MIN)
    .max(CRS_MAX),
  category: z.enum(CATEGORIES),
});

type FormValues = z.infer<typeof schema>;

export default function ProfileScreen() {
  const { data: profile, isLoading } = useProfile();
  const { mutate: updateProfile, isPending: saving } = useUpdateProfile();
  const { mutate: logout, isPending: loggingOut } = useLogout();

  const { control, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { crs_score: 0, category: 'General' },
  });

  useEffect(() => {
    if (profile) {
      reset({ crs_score: profile.crs_score, category: profile.category });
    }
  }, [profile, reset]);

  const onSubmit = (values: FormValues) => updateProfile(values);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
        </View>
        <View style={styles.skeletons}>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <ScreenWrapper scrollable keyboardAvoiding>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      {/* CRS Settings */}
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Express Entry Profile</Text>

        <Controller
          control={control}
          name="crs_score"
          render={({ field: { onChange, value } }) => (
            <Input
              label="CRS Score"
              value={String(value)}
              onChangeText={(v) => onChange(parseInt(v, 10) || 0)}
              error={errors.crs_score?.message}
              keyboardType="numeric"
              hint="Enter your current CRS score (0–1200)"
            />
          )}
        />

        <Text style={styles.label}>Category</Text>
        <View style={styles.categoryGrid}>
          {CATEGORIES.map((cat) => (
            <Controller
              key={cat}
              control={control}
              name="category"
              render={({ field: { onChange, value } }) => (
                <Button
                  title={cat}
                  variant={value === cat ? 'primary' : 'outline'}
                  size="sm"
                  onPress={() => onChange(cat)}
                  style={styles.catBtn}
                />
              )}
            />
          ))}
        </View>

        <Button
          title="Save Profile"
          onPress={handleSubmit(onSubmit)}
          loading={saving}
          fullWidth
          style={styles.saveBtn}
        />
      </Card>

      {/* Account */}
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <Button
          title="Sign Out"
          variant="danger"
          onPress={() => logout()}
          loading={loggingOut}
          fullWidth
        />
      </Card>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.surfacePrimary },
  header: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.sm,
  },
  skeletons: { padding: spacing.base, gap: spacing.sm },
  title: { color: palette.white, fontSize: typography['3xl'], fontWeight: typography.bold },
  section: { gap: spacing.base, margin: spacing.base, marginTop: 0 },
  sectionTitle: {
    color: palette.white,
    fontSize: typography.lg,
    fontWeight: typography.semibold,
  },
  label: {
    color: palette.textSecondary,
    fontSize: typography.sm,
    fontWeight: typography.medium,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  catBtn: { flex: 0 },
  saveBtn: { marginTop: spacing.sm },
});
