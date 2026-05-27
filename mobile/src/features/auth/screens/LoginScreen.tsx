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
import { useLogin, useGoogleLogin, useAppleLogin } from '../hooks/useAuth';
import { signInWithGoogle } from '@/services/googleSignIn';
import { signInWithApple, isAppleSignInAvailable } from '@/services/appleSignIn';
import { palette, spacing, typography, borderRadius } from '@/theme';
import type { AuthStackParamList } from '@/types';

const schema = z.object({
  email:    z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type FormValues = z.infer<typeof schema>;
type Nav = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

export default function LoginScreen() {
  const navigation = useNavigation<Nav>();
  const { mutate: login, isPending }             = useLogin();
  const { mutate: googleLogin, isPending: gPending } = useGoogleLogin();
  const { mutate: appleLogin,  isPending: aPending }  = useAppleLogin();
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    isAppleSignInAvailable().then(setAppleAvailable);
  }, []);

  const { control, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = (values: FormValues) => login(values);

  const onGooglePress = async () => {
    try {
      const idToken = await signInWithGoogle();
      googleLogin(idToken);
    } catch (_) {}
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
    } catch (_) {}
  };

  return (
    <ScreenWrapper scrollable keyboardAvoiding>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoBox}>
            <Text style={styles.logoText}>CRS</Text>
          </View>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to track your CRS score</Text>
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
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
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
          <Text style={styles.dividerText}>or continue with email</Text>
          <View style={styles.divider} />
        </View>

        {/* Email form */}
        <View style={styles.form}>
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
                textContentType="password"
                returnKeyType="done"
                onSubmitEditing={handleSubmit(onSubmit)}
              />
            )}
          />

          <TouchableOpacity
            onPress={() => navigation.navigate('ForgotPassword')}
            accessibilityRole="button"
          >
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          <Button
            title="Sign In"
            onPress={handleSubmit(onSubmit)}
            loading={isPending}
            fullWidth
            style={styles.btn}
          />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')} accessibilityRole="button">
            <Text style={styles.link}>Sign up</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', gap: spacing['2xl'] },
  header: { alignItems: 'center', gap: spacing.sm },
  logoBox: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: palette.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: palette.white,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 1,
  },
  title: {
    color: palette.white,
    fontSize: typography['3xl'],
    fontWeight: typography.bold,
  },
  subtitle: { color: palette.textSecondary, fontSize: typography.base },
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
  forgotText: {
    color: palette.blue,
    fontSize: typography.sm,
    textAlign: 'right',
    fontWeight: typography.medium,
  },
  btn: { marginTop: spacing.sm },
  footer: { flexDirection: 'row', justifyContent: 'center' },
  footerText: { color: palette.textSecondary, fontSize: typography.base },
  link: { color: palette.blue, fontSize: typography.base, fontWeight: typography.semibold },
});
