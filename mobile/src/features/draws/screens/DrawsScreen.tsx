import React, { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DrawCard } from '../components/DrawCard';
import { SkeletonCard } from '@/components/common/SkeletonCard';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { useDraws } from '../hooks/useDraws';
import { DRAW_FILTERS } from '@/constants';
import { palette, spacing, typography, borderRadius } from '@/theme';
import { useColors } from '@/hooks/useColors';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useTabBarLayout } from '@/hooks/useTabBarLayout';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import type { Colors } from '@/theme/colors';
import type { DrawFilter } from '@/types';

function makeStyles(c: Colors, accent: string) {
  return StyleSheet.create({
    safe:       { flex: 1, backgroundColor: c.surfacePrimary },
    header:     { paddingHorizontal: spacing.base, paddingTop: spacing.base, gap: spacing.xs },
    greeting:   { color: c.textMuted, fontSize: typography.sm, fontWeight: typography.medium, letterSpacing: 0.5, textTransform: 'uppercase' },
    title:      { color: c.textPrimary, fontSize: typography['4xl'], fontWeight: typography.black, letterSpacing: -0.5 },
    subtitle:   { color: c.textMuted, fontSize: typography.sm, marginTop: spacing.xs },
    skeletons:  { padding: spacing.base, gap: spacing.sm },

    // Filter pills — premium segmented look
    filterWrap:    { paddingHorizontal: spacing.base, paddingVertical: spacing.sm },
    filterRow:     { flexDirection: 'row', gap: spacing.xs, backgroundColor: c.surfaceSecondary, borderRadius: borderRadius.md, padding: spacing.xs, borderWidth: 0.3, borderColor: c.border },
    filterBtn:     { flex: 1, alignItems: 'center', paddingVertical: spacing.sm - 2, borderRadius: borderRadius.md },
    filterBtnActive: { backgroundColor: accent },
    filterText:    { color: c.textSecondary, fontSize: typography.sm, fontWeight: typography.semibold },
    filterTextActive: { color: palette.white },

    listContent: { paddingHorizontal: spacing.base },
  });
}

export default function DrawsScreen() {
  const [activeFilter, setActiveFilter] = useState<DrawFilter>('all');
  const colors = useColors();
  const accent = useAccentColor();
  const { contentPaddingBottom } = useTabBarLayout();
  const { contentFrameStyle } = useResponsiveLayout();
  const styles = makeStyles(colors, accent);
  const { draws, isLoading, isRefreshing, isError, error, refetch } = useDraws({ filter: activeFilter });

  const listContentStyle = [styles.listContent, { paddingBottom: contentPaddingBottom }, contentFrameStyle];

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <Text style={styles.greeting}>Express Entry</Text>
          <Text style={styles.title}>Draw History</Text>
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

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Express Entry</Text>
        <Text style={styles.title}>Draw History</Text>
        <Text style={styles.subtitle}>{draws.length} draws found</Text>
      </View>

      {/* Segmented filter control */}
      <View style={styles.filterWrap}>
        <View style={styles.filterRow}>
          {DRAW_FILTERS.map((f) => (
            <TouchableOpacity
              key={f.value}
              onPress={() => setActiveFilter(f.value)}
              style={[styles.filterBtn, activeFilter === f.value && styles.filterBtnActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: activeFilter === f.value }}
            >
              <Text style={[styles.filterText, activeFilter === f.value && styles.filterTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {draws.length === 0 ? (
        <EmptyState icon="flash-outline" title="No draws found" description="Try changing the filter or check back after a new draw is published." />
      ) : (
        <FlatList
          data={draws}
          keyExtractor={(item) => String(item.draw_number)}
          renderItem={({ item }) => <DrawCard draw={item} />}
          contentContainerStyle={listContentStyle}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refetch} tintColor={accent} colors={[accent]} />}
        />
      )}
    </SafeAreaView>
  );
}
