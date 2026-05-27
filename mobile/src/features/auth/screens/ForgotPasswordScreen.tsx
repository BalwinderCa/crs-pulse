import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Header } from '@/components/layout/Header';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { authApi } from '@/api';
import { palette, spacing, typography } from '@/theme';

const schema = z.object({
  email: z.string().email('Invalid email address'),
});

type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordScreen() {
  const [submitted, setSubmitted] = useState(false);

  const { mutate, isPending } = useMutation({
    mutationFn: (email: string) => authApi.forgotPassword(email),
    onSuccess: () => setSubmitted(true),
  });

  const { control, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  return (
    <ScreenWrapper keyboardAvoiding>
      <Header title="Reset Password" showBack />

      <View style={styles.container}>
        {submitted ? (
          <View style={styles.success}>
            <Text style={styles.successIcon}>✉️</Text>
            <Text style={styles.successTitle}>Check your email</Text>
            <Text style={styles.successText}>
              We've sent password reset instructions to your email address.
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.description}>
              Enter your email address and we'll send you a link to reset your password.
            </Text>

            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Email"
                  value={value}
                  onChangeText={onChange}
                  error={errors.email?.message}
                  leftIcon="mail-outline"
                  keyboardType="email-address"
                  textContentType="emailAddress"
                />
              )}
            />

            <Button
              title="Send Reset Link"
              onPress={handleSubmit((v) => mutate(v.email))}
              loading={isPending}
              fullWidth
              style={styles.btn}
            />
          </>
        )}
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.base, gap: spacing.lg },
  description: { color: palette.textSecondary, fontSize: typography.base, lineHeight: 22 },
  btn: { marginTop: spacing.sm },
  success: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.base },
  successIcon: { fontSize: 56 },
  successTitle: { color: palette.white, fontSize: typography.xl, fontWeight: typography.bold },
  successText: { color: palette.textSecondary, fontSize: typography.base, textAlign: 'center' },
});
