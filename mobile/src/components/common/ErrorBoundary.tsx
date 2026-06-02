import React, { Component, ReactNode } from 'react';
import { Appearance, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { palette, spacing, typography } from '@/theme';
import { darkColors, lightColors } from '@/theme/colors';

type Props = { children: ReactNode; fallback?: ReactNode };
type State = { hasError: boolean; error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      const c = Appearance.getColorScheme() === 'light' ? lightColors : darkColors;

      return (
        <View style={[styles.container, { backgroundColor: c.surfacePrimary }]} accessibilityRole="alert">
          <Text style={styles.emoji}>⚠️</Text>
          <Text style={[styles.title, { color: c.textPrimary }]}>Something went wrong</Text>
          <Text style={[styles.message, { color: c.textSecondary }]}>{this.state.error?.message}</Text>
          <TouchableOpacity style={styles.btn} onPress={this.reset} accessibilityRole="button" accessibilityLabel="Try again">
            <Text style={styles.btnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing['2xl'], gap: spacing.base },
  emoji:     { fontSize: 48 },
  title:     { fontSize: typography.xl, fontWeight: typography.bold },
  message:   { fontSize: typography.sm, textAlign: 'center' },
  btn:       { marginTop: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: 8, borderWidth: 1.5, borderColor: palette.blue },
  btnText:   { color: palette.blue, fontWeight: typography.semibold },
});
