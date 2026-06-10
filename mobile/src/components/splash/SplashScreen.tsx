import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { typography, spacing } from '@/theme';

export default function SplashScreen() {
  return (
    <View style={styles.container}>
      <Image
        source={require('../../../assets/logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.title}>CRS Pulse</Text>
      <Text style={styles.subtitle}>Express Entry Tracker</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0A1628',
    gap: spacing.sm,
  },
  logo:     { width: 180, height: 180, marginBottom: 8 },
  title:    { fontSize: typography['4xl'], fontWeight: typography.bold, textAlign: 'center', letterSpacing: -0.5, color: '#7BA7D4' },
  subtitle: { fontSize: typography.base, textAlign: 'center', color: '#E63946' },
});
