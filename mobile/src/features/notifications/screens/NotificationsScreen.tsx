import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format, parseISO } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { useAllNotificationItems, useMarkAllRead, useMarkRead, useNotificationsList } from '../hooks/useNotifications';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { SkeletonCard } from '@/components/common/SkeletonCard';
import { palette, spacing, typography } from '@/theme';
import type { AppNotification } from '@/types';

const TYPE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  new_draw:        'document-text-outline',
  score_threshold: 'trending-up-outline',
  weekly_summary:  'calendar-outline',
};

function NotificationItem({ item, onMarkRead }: { item: AppNotification; onMarkRead: (id: string) => void }) {
  return (
    <TouchableOpacity
      style={[styles.item, !item.read_at && styles.unread]}
      onPress={() => !item.read_at && onMarkRead(String(item.id))}
      accessibilityRole="button"
      accessibilityLabel={item.data['title'] as string}
      accessibilityState={{ selected: !item.read_at }}
    >
      <View style={styles.iconWrap}>
        <Ionicons
          name={TYPE_ICONS[item.type] ?? 'notifications-outline'}
          size={20}
          color={!item.read_at ? palette.blue : palette.gray400}
        />
      </View>
      <View style={styles.itemContent}>
        <Text style={[styles.itemTitle, !item.read_at && styles.unreadText]}>
          {item.data['title'] as string}
        </Text>
        <Text style={styles.itemBody} numberOfLines={2}>
          {item.data['body'] as string}
        </Text>
        <Text style={styles.itemTime}>
          {format(parseISO(item.created_at), 'MMM d, h:mm a')}
        </Text>
      </View>
      {!item.read_at && <View style={styles.dot} />}
    </TouchableOpacity>
  );
}

export default function NotificationsScreen() {
  const {
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useNotificationsList();

  const { mutate: markRead }    = useMarkRead();
  const { mutate: markAllRead, isPending: markingAll } = useMarkAllRead();
  const notifications = useAllNotificationItems();

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.title}>Notifications</Text>
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
        <ErrorState message={(error as { message: string })?.message} onRetry={refetch} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Notifications</Text>
        {notifications.some((n) => !n.read_at) && (
          <TouchableOpacity
            onPress={() => markAllRead()}
            disabled={markingAll}
            accessibilityRole="button"
            accessibilityLabel="Mark all as read"
          >
            <Text style={styles.markAll}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {notifications.length === 0 ? (
        <EmptyState
          icon="notifications-outline"
          title="No notifications yet"
          description="You'll be notified when new draws are published."
        />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <NotificationItem item={item} onMarkRead={markRead} />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          onEndReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator size="small" color={palette.blue} style={styles.loader} />
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.surfacePrimary },
  header: { paddingHorizontal: spacing.base, paddingTop: spacing.base },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.sm,
  },
  title: { color: palette.white, fontSize: typography['3xl'], fontWeight: typography.bold },
  markAll: { color: palette.blue, fontSize: typography.sm, fontWeight: typography.medium },
  skeletons: { padding: spacing.base, gap: spacing.sm },
  listContent: { paddingBottom: spacing['4xl'] },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.base,
    gap: spacing.md,
  },
  unread: { backgroundColor: `${palette.blue}08` },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.surfaceTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemContent: { flex: 1, gap: 4 },
  itemTitle: { color: palette.textSecondary, fontSize: typography.base, fontWeight: typography.medium },
  unreadText: { color: palette.white },
  itemBody: { color: palette.textSecondary, fontSize: typography.sm, lineHeight: 18 },
  itemTime: { color: palette.textMuted, fontSize: typography.xs },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: palette.blue, marginTop: 4 },
  separator: { height: 1, backgroundColor: palette.surfaceTertiary },
  loader: { padding: spacing.base },
});
