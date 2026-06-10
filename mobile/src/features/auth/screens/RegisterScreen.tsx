import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { useRegister, useGoogleLogin, useAppleLogin } from '../hooks/useAuth';
import { signInWithGoogle } from '@/services/googleSignIn';
import { signInWithApple, isAppleSignInAvailable } from '@/services/appleSignIn';
import { palette, spacing, typography, borderRadius } from '@/theme';
import type { AuthStackParamList } from '@/types';

const schema = z.object({
  name:                  z.string().min(2, 'Name must be at least 2 characters').max(100),
  email:                 z.string().email('Invalid email address'),
  password:              z.string().min(8, 'Password must be at least 8 characters'),
  password_confirmation: z.string(),
}).refine((d) => d.password === d.password_confirmation, {
  message: 'Passwords do not match',
  path: ['password_confirmation'],
});

type FormValues = z.infer<typeof schema>;
type Nav = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

export default function RegisterScreen() {
  const navigation = useNavigation<Nav>();
  const { mutate: register, isPending }               = useRegister();
  const { mutate: googleLogin, isPending: gPending }  = useGoogleLogin();
  const { mutate: appleLogin }  = useAppleLogin();
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    isAppleSignInAvailable().then(setAppleAvailable);
  }, []);

  const { control, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', password: '', password_confirmation: '' },
  });

  const onSubmit = (values: FormValues) => register(values);

  const onGooglePress = async () => {
    try {
      const idToken = await signInWithGoogle();
      googleLogin(idToken);
    } catch {}
  };

  const onApplePress = async () => {
    try {
      const result = await signInWithApple();
      const fullName = result.fullName
        ? [result.fullName.givenName, result.fullName.familyName].filter(Boolean).join(' ')
        : null;
      appleLogin({
        identity_token: result.identityToken,
        nonce:          result.nonce,
        full_name:      fullName,
      });
    } catch {}
  };

  return (
    <ScreenWrapper scrollable keyboardAvoiding>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Start tracking your Express Entry journey</Text>
        </View>

        {/* Social auth */}
        <View style={styles.socialRow}>
          <TouchableOpacity
            style={styles.socialBtn}
            onPress={onGooglePress}
            disabled={gPending}
            accessibilityRole="button"
            accessibilityLabel="Continue with Google"
          >
            <Text style={styles.socialIcon}>G</Text>
            <Text style={styles.socialText}>Google</Text>
          </TouchableOpacity>

          {appleAvailable && Platform.OS === 'ios' && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
              cornerRadius={borderRadius.md}
              style={styles.appleBtn}
              onPress={onApplePress}
            />
          )}
        </View>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>or sign up with email</Text>
          <View style={styles.divider} />
        </View>

        <View style={styles.form}>
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, value, ref } }) => (
              <Input
                ref={ref}
                label="Full Name"
                value={value}
                onChangeText={onChange}
                error={errors.name?.message}
                leftIcon="person-outline"
                textContentType="name"
                returnKeyType="next"
              />
            )}
          />

          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, value, ref } }) => (
              <Input
                ref={ref}
                label="Email"
                value={value}
                onChangeText={onChange}
                error={errors.email?.message}
                leftIcon="mail-outline"
                keyboardType="email-address"
                textContentType="emailAddress"
                autoComplete="email"
                returnKeyType="next"
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, value, ref } }) => (
              <Input
                ref={ref}
                label="Password"
                value={value}
                onChangeText={onChange}
                error={errors.password?.message}
                leftIcon="lock-closed-outline"
                secureTextEntry
                textContentType="newPassword"
                returnKeyType="next"
              />
            )}
          />

          <Controller
            control={control}
            name="password_confirmation"
            render={({ field: { onChange, value, ref } }) => (
              <Input
                ref={ref}
                label="Confirm Password"
                value={value}
                onChangeText={onChange}
                error={errors.password_confirmation?.message}
                leftIcon="lock-closed-outline"
                secureTextEntry
                textContentType="newPassword"
                returnKeyType="done"
                onSubmitEditing={handleSubmit(onSubmit)}
              />
            )}
          />

          <Button
            title="Create Account"
            onPress={handleSubmit(onSubmit)}
            loading={isPending}
            fullWidth
            style={styles.btn}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')} accessibilityRole="button">
            <Text style={styles.link}>Sign in</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', gap: spacing['2xl'] },
  header: { alignItems: 'center', gap: spacing.sm },
  title: {
    color: palette.white,
    fontSize: typography['3xl'],
    fontWeight: typography.bold,
  },
  subtitle: { color: palette.textSecondary, fontSize: typography.base, textAlign: 'center' },
  socialRow: { gap: spacing.sm },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: borderRadius.md,
    backgroundColor: palette.white,
    gap: spacing.sm,
  },
  socialIcon: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4285F4',
  },
  socialText: {
    fontSize: typography.base,
    fontWeight: typography.semibold,
    color: palette.gray800,
  },
  appleBtn: { width: '100%', height: 52 },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  divider: { flex: 1, height: 1, backgroundColor: palette.surfaceTertiary },
  dividerText: { color: palette.textMuted, fontSize: typography.xs },
  form: { gap: spacing.base },
  btn: { marginTop: spacing.sm },
  footer: { flexDirection: 'row', justifyContent: 'center' },
  footerText: { color: palette.textSecondary, fontSize: typography.base },
  link: { color: palette.blue, fontSize: typography.base, fontWeight: typography.semibold },
});
