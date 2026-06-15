import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LineChart } from 'react-native-chart-kit';
import { useAnalytics } from '../hooks/useAnalytics';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { SkeletonCard } from '@/components/common/SkeletonCard';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { palette, spacing, typography, borderRadius } from '@/theme';
import { useColors } from '@/hooks/useColors';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useTabBarLayout } from '@/hooks/useTabBarLayout';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import type { Colors } from '@/theme/colors';
import type { Category, RootStackParamList } from '@/types';
import { AppHeader } from '@/components/layout/AppHeader';

const PERIODS = [
  { label: '3M', value: '3m' as const },
  { label: '6M', value: '6m' as const },
  { label: '1Y', value: '1y' as const },
  { label: 'All', value: 'all' as const },
];

const CATEGORIES: Array<{ label: string; value: Category | 'all' }> = [
  { label: 'All',     value: 'all' },
  { label: 'CEC',     value: 'CEC' },
  { label: 'General', value: 'General' },
  { label: 'STEM',    value: 'STEM' },
  { label: 'French',  value: 'French' },
];

function makeStyles(c: Colors, accent: string) {
  return StyleSheet.create({
    safe:     { flex: 1, backgroundColor: c.surfacePrimary },
    content:  { gap: spacing.md },
    header:   { paddingHorizontal: spacing.base, paddingTop: spacing.base, gap: spacing.xs },
    greeting: { color: c.textMuted, fontSize: typography.sm, fontWeight: typography.medium, letterSpacing: 0.5, textTransform: 'uppercase' },
    title:    { color: c.textPrimary, fontSize: typography['4xl'], fontWeight: typography.black, letterSpacing: -0.5 },
    skeletons:{ padding: spacing.base, gap: spacing.sm },

    premiumBanner: {
      flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
      marginHorizontal: spacing.base,
      backgroundColor: c.surfaceCard, borderRadius: borderRadius.md,
      borderWidth: 1, borderColor: accent + '40', padding: spacing.md,
    },
    premiumIcon: { width: 32, height: 32, borderRadius: borderRadius.md,
                   alignItems: 'center', justifyContent: 'center', backgroundColor: accent + '18' },
    premiumTitle: { color: c.textPrimary, fontSize: typography.sm, fontWeight: typography.bold },
    premiumSub:   { color: c.textMuted, fontSize: typography.xs, marginTop: 1 },

    // Category pills (horizontal scroll)
    catScroll:  { paddingLeft: spacing.base },
    catRow:     { flexDirection: 'row', gap: spacing.xs, paddingRight: spacing.base },
    catBtn:     { paddingHorizontal: spacing.md, paddingVertical: spacing.sm - 2, borderRadius: borderRadius.md, backgroundColor: c.surfaceSecondary, borderWidth: 0.3, borderColor: c.border },
    catBtnActive: { backgroundColor: accent, borderColor: accent },
    catText:      { color: c.textSecondary, fontSize: typography.sm, fontWeight: typography.semibold },
    catTextActive:{ color: palette.white },

    // Period selector — solid pill tabs
    periodWrap: { paddingHorizontal: spacing.base },
    periodRow: {
      flexDirection: 'row',
      backgroundColor: c.surfaceSecondary,
      borderRadius: borderRadius.md,
      padding: spacing.xs,
      gap: spacing.xs,
      borderWidth: 0.3,
      borderColor: c.border,
    },
    periodBtn:        { flex: 1, alignItems: 'center', paddingVertical: spacing.sm - 2, borderRadius: borderRadius.md },
    periodBtnActive:  { backgroundColor: accent },
    periodText:       { color: c.textSecondary, fontSize: typography.sm, fontWeight: typography.semibold },
    periodTextActive: { color: palette.white },

    // Stats 2×2 grid
    statsGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingHorizontal: spacing.base },
    statCard:     { flex: 1, minWidth: '45%', gap: 6, backgroundColor: c.surfaceCard, borderRadius: borderRadius.md, borderWidth: 0.3, borderColor: c.border, padding: spacing.base },
    statCardLabel:{ color: c.textMuted, fontSize: typography.xs, fontWeight: typography.semibold, letterSpacing: 0.5, textTransform: 'uppercase' },
    statCardValue:{ color: c.textPrimary, fontSize: typography['3xl'], fontWeight: typography.black, letterSpacing: -0.5 },

    // Trend card
    trendCard:    { marginHorizontal: spacing.base, gap: spacing.sm },
    trendLabel:   { color: c.textSecondary, fontSize: typography.sm, fontWeight: typography.semibold, letterSpacing: 0.3, textTransform: 'uppercase' },
    trendRow:     { gap: spacing.sm },
    trendDesc:    { color: c.textSecondary, fontSize: typography.sm, lineHeight: 20 },

    // Chart
    chartCard:    { marginHorizontal: spacing.base, overflow: 'hidden', padding: spacing.base, gap: spacing.sm },
    chartTitle:   { color: c.textMuted, fontSize: typography.xs, fontWeight: typography.semibold, letterSpacing: 0.5, textTransform: 'uppercase' },
    chart:        { borderRadius: borderRadius.md },

    // Totals
    totalsCard:   { marginHorizontal: spacing.base },
    bigStatLabel: { color: c.textMuted, fontSize: typography.xs, fontWeight: typography.semibold, letterSpacing: 0.5, textTransform: 'uppercase' },
    bigStat:      { color: c.textPrimary, fontSize: typography['4xl'], fontWeight: typography.black, letterSpacing: -1 },
    statSub:      { color: c.textMuted, fontSize: typography.sm },
  });
}

export default function AnalyticsScreen() {
  const [period, setPeriod]     = useState<'all' | '1y' | '6m' | '3m'>('1y');
  const [category, setCategory] = useState<Category | 'all'>('all');
  const colors = useColors();
  const accent = useAccentColor();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { contentPaddingBottom } = useTabBarLayout();
  const { contentMaxWidth, contentFrameStyle } = useResponsiveLayout();
  const { width: screenWidth } = useWindowDimensions();
  const styles = makeStyles(colors, accent);
  const chartWidth = Math.min(screenWidth, contentMaxWidth ?? screenWidth) - spacing.base * 4;

  const { data, isLoading, isError, error, refetch } = useAnalytics({ category, period });

  const scrollContentStyle = [styles.content, { paddingBottom: contentPaddingBottom }, contentFrameStyle];

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <AppHeader title="Trends" />
        </View>
        <View style={styles.skeletons}>{[1,2,3].map((k) => <SkeletonCard key={k} />)}</View>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <ErrorState message={(error as { message: string })?.message} onRetry={refetch} />
      </SafeAreaView>
    );
  }

  if (!data || data.total_draws === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <EmptyState icon="pulse-outline" title="No analytics data" description="Analytics will appear once draws are published." />
      </SafeAreaView>
    );
  }

  const chartLabels = data.chart_data
    .filter((_, i) => i % Math.max(1, Math.floor(data.chart_data.length / 6)) === 0)
    .map((d) => d.date.slice(5));
  const chartValues = data.chart_data.map((d) => d.cutoff);

  const trendBadge = data.trend === 'rising' ? 'success' as const : data.trend === 'falling' ? 'danger' as const : 'neutral' as const;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={scrollContentStyle}>
        <View style={styles.header}>
          <AppHeader title="Trends" />
        </View>

        {/* Premium Analytics entry */}
        <TouchableOpacity
          style={styles.premiumBanner}
          onPress={() => nav.navigate('PremiumAnalytics')}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Open Premium Analytics"
        >
          <View style={styles.premiumIcon}>
            <Ionicons name="sparkles" size={16} color={accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.premiumTitle}>Premium Analytics</Text>
            <Text style={styles.premiumSub}>Personalized odds, forecasts & what-if</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>

        {/* Category filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
          <View style={styles.catRow}>
            {CATEGORIES.map((c) => (
              <TouchableOpacity
                key={c.value}
                onPress={() => setCategory(c.value)}
                style={[styles.catBtn, category === c.value && styles.catBtnActive]}
                accessibilityRole="button"
              >
                <Text style={[styles.catText, category === c.value && styles.catTextActive]}>{c.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Period segmented control */}
        <View style={styles.periodWrap}>
          <View style={styles.periodRow}>
            {PERIODS.map((p) => (
              <TouchableOpacity
                key={p.value}
                onPress={() => setPeriod(p.value)}
                style={[styles.periodBtn, period === p.value && styles.periodBtnActive]}
                accessibilityRole="button"
              >
                <Text style={[styles.periodText, period === p.value && styles.periodTextActive]}>{p.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          <RawStatCard label="Avg Cutoff"  value={data.average_cutoff} styles={styles} />
          <RawStatCard label="Peak Cutoff" value={data.highest_cutoff} styles={styles} />
          <RawStatCard label="Low Cutoff"  value={data.lowest_cutoff}  styles={styles} />
          <RawStatCard label="Total Draws" value={data.total_draws}    styles={styles} />
        </View>

        {/* Trend card */}
        <Card style={styles.trendCard}>
          <Text style={styles.trendLabel}>Score Trend</Text>
          <View style={styles.trendRow}>
            <Badge
              label={`${data.trend.charAt(0).toUpperCase() + data.trend.slice(1)}  ${data.trend_percentage.toFixed(1)}%`}
              variant={trendBadge}
            />
            <Text style={styles.trendDesc}>
              {data.trend === 'rising'
                ? 'Cutoff scores are climbing — consider boosting your profile.'
                : data.trend === 'falling'
                ? 'Scores are easing — conditions may be improving for you.'
                : 'Cutoff scores are holding steady.'}
            </Text>
          </View>
        </Card>

        {/* Chart */}
        {chartValues.length > 1 && (
          <Card padding={0} style={styles.chartCard}>
            <Text style={styles.chartTitle}>CRS Cutoff Trend</Text>
            <LineChart
              data={{ labels: chartLabels, datasets: [{ data: chartValues, strokeWidth: 2 }] }}
              width={chartWidth}
              height={200}
              yAxisSuffix=""
              chartConfig={{
                backgroundGradientFrom: colors.surfaceCard,
                backgroundGradientTo:   colors.surfaceCard,
                color: (opacity = 1) => `${accent}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`,
                labelColor: () => colors.textMuted,
                strokeWidth: 2,
                propsForDots: { r: '4', strokeWidth: '2', stroke: accent },
                decimalPlaces: 0,
              }}
              bezier
              style={styles.chart}
            />
          </Card>
        )}

        {/* Totals */}
        <Card style={styles.totalsCard}>
          <Text style={styles.bigStatLabel}>Total Invitations</Text>
          <Text style={styles.bigStat}>{data.total_invitations.toLocaleString()}</Text>
          <Text style={styles.statSub}>across {data.total_draws} draws</Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function RawStatCard({ label, value, styles }: { label: string; value: number; styles: ReturnType<typeof makeStyles> }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statCardLabel}>{label}</Text>
      <Text style={styles.statCardValue}>{value.toLocaleString()}</Text>
    </View>
  );
}
