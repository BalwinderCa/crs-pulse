import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { palette, typography, spacing } from '@/theme';

// This component shows while auth state is being resolved (isInitialized: false).
// The native expo-splash-screen is visible on top, so the user sees that instead.
// No animation needed here — it would fire warnings when unmounted before completing.
export default function SplashScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.logoBox}>
        <Text style={styles.logo}>CRS</Text>
      </View>
      <Text style={styles.title}>CRS Pulse</Text>
      <Text style={styles.subtitle}>Express Entry Tracker</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.surfacePrimary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  logoBox: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#1A6DFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  logo: { fontSize: 26, fontWeight: '800', color: '#fff', letterSpacing: 1.5 },
  title: {
    color: palette.white,
    fontSize: typography['4xl'],
    fontWeight: typography.bold,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: palette.textSecondary,
    fontSize: typography.base,
    textAlign: 'center',
  },
});
