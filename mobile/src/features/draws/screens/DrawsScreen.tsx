import React, { useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DrawCard } from '../components/DrawCard';
import { SkeletonCard } from '@/components/common/SkeletonCard';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { useDraws } from '../hooks/useDraws';
import { DRAW_FILTERS } from '@/constants';
import { palette, spacing, typography, borderRadius } from '@/theme';
import type { DrawFilter } from '@/types';

export default function DrawsScreen() {
  const [activeFilter, setActiveFilter] = useState<DrawFilter>('all');
  const { draws, isLoading, isRefreshing, isError, error, refetch } = useDraws({ filter: activeFilter });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.title}>Draw History</Text>
        </View>
        <View style={styles.skeletons}>
          {[1, 2, 3].map((k) => <SkeletonCard key={k} />)}
        </View>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={styles.safe}>
        <ErrorState
          message={(error as { message: string })?.message}
          onRetry={refetch}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Draw History</Text>
        <Text style={styles.subtitle}>{draws.length} draws found</Text>
      </View>

      {/* Filters */}
      <View style={styles.filterRow}>
        {DRAW_FILTERS.map((f) => (
          <TouchableOpacity
            key={f.value}
            onPress={() => setActiveFilter(f.value)}
            style={[styles.filterBtn, activeFilter === f.value && styles.filterBtnActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: activeFilter === f.value }}
          >
            <Text style={[styles.filterText, activeFilter === f.value && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      {draws.length === 0 ? (
        <EmptyState
          icon="document-outline"
          title="No draws found"
          description="Try changing the filter or check back after a new draw is published."
        />
      ) : (
        <FlatList
          data={draws}
          keyExtractor={(item) => String(item.draw_number)}
          renderItem={({ item }) => <DrawCard draw={item} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={refetch}
              tintColor={palette.blue}
              colors={[palette.blue]}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.surfacePrimary },
  header: { paddingHorizontal: spacing.base, paddingTop: spacing.base, gap: 2 },
  title: { color: palette.white, fontSize: typography['3xl'], fontWeight: typography.bold },
  subtitle: { color: palette.textSecondary, fontSize: typography.sm },
  skeletons: { padding: spacing.base, gap: spacing.sm },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  filterBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: palette.surfaceTertiary,
    borderWidth: 1,
    borderColor: palette.surfaceTertiary,
  },
  filterBtnActive: {
    backgroundColor: palette.blueFaint,
    borderColor: palette.blue,
  },
  filterText: { color: palette.textSecondary, fontSize: typography.sm, fontWeight: typography.medium },
  filterTextActive: { color: palette.blue },
  listContent: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing['4xl'],
  },
});
