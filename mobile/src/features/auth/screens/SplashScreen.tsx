import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { palette, typography, spacing } from '@/theme';
import { useColors } from '@/hooks/useColors';

export default function SplashScreen() {
  const colors = useColors();
  return (
    <View style={[styles.container, { backgroundColor: colors.surfacePrimary }]}>
      <View style={styles.logoBox}>
        <Text style={styles.logo}>CRS</Text>
      </View>
      <Text style={[styles.title, { color: colors.textPrimary }]}>CRS Pulse</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Express Entry Tracker</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  logoBox: {
    width: 80, height: 80, borderRadius: 20,
    backgroundColor: '#1A6DFF',
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  logo:     { fontSize: 26, fontWeight: '800', color: palette.white, letterSpacing: 1.5 },
  title:    { fontSize: typography['4xl'], fontWeight: typography.bold, textAlign: 'center', letterSpacing: -0.5 },
  subtitle: { fontSize: typography.base, textAlign: 'center' },
});
