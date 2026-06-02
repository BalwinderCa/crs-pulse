import React from 'react';
import { FlatList, Linking, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const IRCC_ROUNDS_URL =
  'https://www.canada.ca/en/immigration-refugees-citizenship/corporate/mandate/policies-operational-instructions/residents/express-entry/rounds-invitations.html';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { ScoreCard } from '../components/ScoreCard';
import { PredictionCard } from '../components/PredictionCard';
import { SkeletonCard } from '@/components/common/SkeletonCard';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { useDashboard } from '../hooks/useDashboard';
import { palette, spacing, typography } from '@/theme';
import { useColors } from '@/hooks/useColors';
import type { Colors } from '@/theme/colors';

function makeStyles(c: Colors) {
  return StyleSheet.create({
    safe:       { flex: 1, backgroundColor: c.surfacePrimary },
    content:    { paddingHorizontal: spacing.base, paddingBottom: spacing['4xl'], gap: spacing.base },
    listHeader: { gap: spacing.base, paddingTop: spacing.base },
    header:     { gap: 2 },
    skeletons:  { padding: spacing.base, gap: spacing.base },
    greeting:   { color: c.textSecondary, fontSize: typography.sm },
    title:      { color: c.textPrimary, fontSize: typography['3xl'], fontWeight: typography.bold },
    sectionTitle: { color: c.textPrimary, fontSize: typography.lg, fontWeight: typography.semibold, marginTop: spacing.sm },
    drawRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: c.surfaceCard,
      borderRadius: 12,
      padding: spacing.base,
    },
    drawDate:     { color: c.textPrimary,   fontSize: typography.base, fontWeight: typography.medium },
    drawCategory: { color: c.textSecondary, fontSize: typography.sm },
    drawRight:    { alignItems: 'flex-end' },
    drawCutoff:   { color: palette.blue, fontSize: typography.xl, fontWeight: typography.bold },
    drawInvites:  { color: c.textMuted, fontSize: typography.xs },
    separator:    { height: spacing.sm },
  });
}

export default function DashboardScreen() {
  const colors = useColors();
  const styles = makeStyles(colors);
  const { data, isLoading, isError, error, refetch, isRefetching } = useDashboard();

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.greeting}>Good day 👋</Text>
          <Text style={styles.title}>Dashboard</Text>
        </View>
        <View style={styles.skeletons}>
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </View>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={styles.safe}>
        <ErrorState message={(error as { message: string })?.message ?? 'Failed to load dashboard.'} onRetry={refetch} />
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <SafeAreaView style={styles.safe}>
        <EmptyState icon="stats-chart-outline" title="No data yet" description="Set up your profile to see your CRS dashboard." />
      </SafeAreaView>
    );
  }

  const { user_score, user_category, latest_draw, prediction, recent_draws } = data;

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={recent_draws}
        keyExtractor={(item) => String(item.id)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={palette.blue} colors={[palette.blue]} />
        }
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <View style={styles.header}>
              <Text style={styles.greeting}>Express Entry</Text>
              <Text style={styles.title}>Dashboard</Text>
            </View>
            {latest_draw && (
              <ScoreCard
                userScore={user_score}
                latestCutoff={latest_draw.cutoff_score}
                category={user_category}
                drawNumber={latest_draw.draw_number}
                drawDate={format(new Date(latest_draw.date), 'MMM d, yyyy')}
              />
            )}
            <PredictionCard prediction={prediction} />
            {recent_draws.length > 0 && <Text style={styles.sectionTitle}>Recent Draws</Text>}
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => Linking.openURL(IRCC_ROUNDS_URL)}
            activeOpacity={0.75}
            accessibilityRole="link"
            accessibilityLabel={`Draw #${item.draw_number} — view on IRCC website`}
          >
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
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
}
