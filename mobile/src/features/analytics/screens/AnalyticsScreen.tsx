import React, { useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LineChart } from 'react-native-chart-kit';
import { useAnalytics } from '../hooks/useAnalytics';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { SkeletonCard } from '@/components/common/SkeletonCard';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { palette, spacing, typography, borderRadius } from '@/theme';
import { useColors } from '@/hooks/useColors';
import type { Colors } from '@/theme/colors';
import type { Category } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - spacing.base * 2;

const PERIODS = [
  { label: '3M', value: '3m' as const },
  { label: '6M', value: '6m' as const },
  { label: '1Y', value: '1y' as const },
  { label: 'All', value: 'all' as const },
];

const CATEGORIES: Array<{ label: string; value: Category | 'all' }> = [
  { label: 'All', value: 'all' },
  { label: 'CEC', value: 'CEC' },
  { label: 'General', value: 'General' },
  { label: 'STEM', value: 'STEM' },
  { label: 'French', value: 'French' },
];

function makeStyles(c: Colors) {
  return StyleSheet.create({
    safe:      { flex: 1, backgroundColor: c.surfacePrimary },
    content:   { paddingBottom: spacing['4xl'], gap: spacing.base },
    header:    { paddingHorizontal: spacing.base, paddingTop: spacing.base },
    title:     { color: c.textPrimary, fontSize: typography['3xl'], fontWeight: typography.bold },
    skeletons: { padding: spacing.base, gap: spacing.sm },
    filterScroll: { paddingLeft: spacing.base },
    filterRow: { flexDirection: 'row', gap: spacing.sm, paddingRight: spacing.base },
    filterBtn: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.full,
      backgroundColor: c.surfaceTertiary,
      borderWidth: 1,
      borderColor: c.border,
    },
    filterBtnActive:  { backgroundColor: palette.blueFaint, borderColor: palette.blue },
    filterText:       { color: c.textSecondary, fontSize: typography.sm, fontWeight: typography.medium },
    filterTextActive: { color: palette.blue },
    periodRow: {
      flexDirection: 'row',
      paddingHorizontal: spacing.base,
      backgroundColor: c.surfaceSecondary,
      borderRadius: borderRadius.md,
      marginHorizontal: spacing.base,
      padding: spacing.xs,
      gap: spacing.xs,
    },
    periodBtn:        { flex: 1, alignItems: 'center', paddingVertical: spacing.xs, borderRadius: borderRadius.sm },
    periodBtnActive:  { backgroundColor: palette.blue },
    periodText:       { color: c.textSecondary, fontSize: typography.sm, fontWeight: typography.medium },
    periodTextActive: { color: palette.white },
    statsGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingHorizontal: spacing.base },
    statCard:         { flex: 1, minWidth: '45%', gap: 4 },
    statCardLabel:    { color: c.textSecondary, fontSize: typography.xs },
    statCardValue:    { color: c.textPrimary, fontSize: typography['2xl'], fontWeight: typography.bold },
    trendCard:        { marginHorizontal: spacing.base, gap: spacing.sm },
    trendLabel:       { color: c.textSecondary, fontSize: typography.sm, fontWeight: typography.medium },
    trendRow:         { gap: spacing.sm },
    trendDesc:        { color: c.textSecondary, fontSize: typography.sm, lineHeight: 20 },
    chartCard:        { marginHorizontal: spacing.base, overflow: 'hidden', padding: spacing.base },
    chartTitle:       { color: c.textSecondary, fontSize: typography.sm, marginBottom: spacing.sm },
    chart:            { borderRadius: borderRadius.md },
    bigStat:          { color: c.textPrimary, fontSize: typography['3xl'], fontWeight: typography.bold },
    statSub:          { color: c.textMuted, fontSize: typography.xs },
  });
}

export default function AnalyticsScreen() {
  const [period, setPeriod]     = useState<'all' | '1y' | '6m' | '3m'>('1y');
  const [category, setCategory] = useState<Category | 'all'>('all');
  const colors = useColors();
  const styles = makeStyles(colors);

  const { data, isLoading, isError, error, refetch } = useAnalytics({ category, period });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}><Text style={styles.title}>Analytics</Text></View>
        <View style={styles.skeletons}>{[1,2,3].map((k) => <SkeletonCard key={k} />)}</View>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={styles.safe}>
        <ErrorState message={(error as { message: string })?.message} onRetry={refetch} />
      </SafeAreaView>
    );
  }

  if (!data || data.total_draws === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <EmptyState icon="bar-chart-outline" title="No analytics data" description="Analytics will appear once draws are published." />
      </SafeAreaView>
    );
  }

  const chartLabels = data.chart_data
    .filter((_, i) => i % Math.max(1, Math.floor(data.chart_data.length / 6)) === 0)
    .map((d) => d.date.slice(5));
  const chartValues = data.chart_data.map((d) => d.cutoff);

  const trendBadge = data.trend === 'rising' ? 'success' as const : data.trend === 'falling' ? 'danger' as const : 'neutral' as const;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}><Text style={styles.title}>Analytics</Text></View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <View style={styles.filterRow}>
            {CATEGORIES.map((c) => (
              <TouchableOpacity key={c.value} onPress={() => setCategory(c.value)}
                style={[styles.filterBtn, category === c.value && styles.filterBtnActive]} accessibilityRole="button">
                <Text style={[styles.filterText, category === c.value && styles.filterTextActive]}>{c.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <View style={styles.periodRow}>
          {PERIODS.map((p) => (
            <TouchableOpacity key={p.value} onPress={() => setPeriod(p.value)}
              style={[styles.periodBtn, period === p.value && styles.periodBtnActive]} accessibilityRole="button">
              <Text style={[styles.periodText, period === p.value && styles.periodTextActive]}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.statsGrid}>
          <StatCard label="Average Cutoff" value={data.average_cutoff} styles={styles} />
          <StatCard label="Highest Cutoff" value={data.highest_cutoff} styles={styles} />
          <StatCard label="Lowest Cutoff"  value={data.lowest_cutoff}  styles={styles} />
          <StatCard label="Total Draws"    value={data.total_draws}    styles={styles} />
        </View>

        <Card style={styles.trendCard}>
          <Text style={styles.trendLabel}>Score Trend</Text>
          <View style={styles.trendRow}>
            <Badge label={`${data.trend.charAt(0).toUpperCase() + data.trend.slice(1)} ${data.trend_percentage.toFixed(1)}%`} variant={trendBadge} />
            <Text style={styles.trendDesc}>
              {data.trend === 'rising'
                ? 'Cutoff scores are going up. Consider improving your profile.'
                : data.trend === 'falling'
                ? 'Cutoff scores are decreasing. You may have a good chance soon.'
                : 'Cutoff scores are stable.'}
            </Text>
          </View>
        </Card>

        {chartValues.length > 1 && (
          <Card padding={0} style={styles.chartCard}>
            <Text style={styles.chartTitle}>CRS Cutoff Trend</Text>
            <LineChart
              data={{ labels: chartLabels, datasets: [{ data: chartValues, strokeWidth: 2 }] }}
              width={CHART_WIDTH}
              height={200}
              yAxisSuffix=""
              chartConfig={{
                backgroundGradientFrom: colors.surfaceCard,
                backgroundGradientTo:   colors.surfaceCard,
                color: (opacity = 1) => `rgba(26, 109, 255, ${opacity})`,
                labelColor: () => palette.gray400,
                strokeWidth: 2,
                propsForDots: { r: '4', strokeWidth: '2', stroke: palette.blue },
                decimalPlaces: 0,
              }}
              bezier
              style={styles.chart}
            />
          </Card>
        )}

        <Card>
          <Text style={styles.trendLabel}>Total Invitations Issued</Text>
          <Text style={styles.bigStat}>{data.total_invitations.toLocaleString()}</Text>
          <Text style={styles.statSub}>across {data.total_draws} draws</Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ label, value, styles }: { label: string; value: number; styles: ReturnType<typeof makeStyles> }) {
  return (
    <Card style={styles.statCard}>
      <Text style={styles.statCardLabel}>{label}</Text>
      <Text style={styles.statCardValue}>{value}</Text>
    </Card>
  );
}
