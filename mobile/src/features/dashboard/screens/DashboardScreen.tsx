import React from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { ScoreCard } from '../components/ScoreCard';
import { PredictionCard } from '../components/PredictionCard';
import { SkeletonCard } from '@/components/common/SkeletonCard';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { useDashboard } from '../hooks/useDashboard';
import { palette, spacing, typography } from '@/theme';

export default function DashboardScreen() {
  const { data, isLoading, isError, error, refetch, isRefetching } = useDashboard();

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.greeting}>Good day 👋</Text>
          <Text style={styles.title}>Dashboard</Text>
        </View>
        <View style={styles.skeletons}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={styles.safe}>
        <ErrorState
          message={(error as { message: string })?.message ?? 'Failed to load dashboard.'}
          onRetry={refetch}
        />
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <SafeAreaView style={styles.safe}>
        <EmptyState
          icon="stats-chart-outline"
          title="No data yet"
          description="Set up your profile to see your CRS dashboard."
        />
      </SafeAreaView>
    );
  }

  const { user_score, user_category, latest_draw, score_difference, prediction, recent_draws } = data;

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={recent_draws}
        keyExtractor={(item) => String(item.id)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={palette.blue}
            colors={[palette.blue]}
          />
        }
        ListHeaderComponent={
          <View style={styles.listHeader}>
            {/* Greeting */}
            <View style={styles.header}>
              <Text style={styles.greeting}>Express Entry</Text>
              <Text style={styles.title}>Dashboard</Text>
            </View>

            {/* Score card */}
            {latest_draw && (
              <ScoreCard
                userScore={user_score}
                latestCutoff={latest_draw.cutoff_score}
                category={user_category}
                drawNumber={latest_draw.draw_number}
                drawDate={format(new Date(latest_draw.date), 'MMM d, yyyy')}
              />
            )}

            {/* Prediction */}
            <PredictionCard prediction={prediction} />

            {/* Recent draws header */}
            {recent_draws.length > 0 && (
              <Text style={styles.sectionTitle}>Recent Draws</Text>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.drawRow}>
            <View>
              <Text style={styles.drawDate}>{format(new Date(item.date), 'MMM d, yyyy')}</Text>
              <Text style={styles.drawCategory}>{item.category}</Text>
            </View>
            <View style={styles.drawRight}>
              <Text style={styles.drawCutoff}>{item.cutoff_score}</Text>
              <Text style={styles.drawInvites}>{item.invitations_issued.toLocaleString()} ITA</Text>
            </View>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.surfacePrimary },
  content: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing['4xl'],
    gap: spacing.base,
  },
  listHeader: { gap: spacing.base, paddingTop: spacing.base },
  header: { gap: 2 },
  skeletons: { padding: spacing.base, gap: spacing.base },
  greeting: { color: palette.textSecondary, fontSize: typography.sm },
  title: { color: palette.white, fontSize: typography['3xl'], fontWeight: typography.bold },
  sectionTitle: {
    color: palette.white,
    fontSize: typography.lg,
    fontWeight: typography.semibold,
    marginTop: spacing.sm,
  },
  drawRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: palette.surfaceCard,
    borderRadius: 12,
    padding: spacing.base,
  },
  drawDate: { color: palette.white, fontSize: typography.base, fontWeight: typography.medium },
  drawCategory: { color: palette.textSecondary, fontSize: typography.sm },
  drawRight: { alignItems: 'flex-end' },
  drawCutoff: { color: palette.blue, fontSize: typography.xl, fontWeight: typography.bold },
  drawInvites: { color: palette.textMuted, fontSize: typography.xs },
  separator: { height: spacing.sm },
});
