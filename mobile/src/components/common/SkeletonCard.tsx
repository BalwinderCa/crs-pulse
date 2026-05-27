import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';
import { palette, borderRadius, spacing } from '@/theme';

type Props = {
  height?: number;
  width?: number | string;
  borderRadius?: number;
  style?: ViewStyle;
};

export function Skeleton({ height = 16, width = '100%', borderRadius: br = 8, style }: Props) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        { height, width: width as number, borderRadius: br, backgroundColor: palette.surfaceTertiary, opacity },
        style,
      ]}
    />
  );
}

export function SkeletonCard({ style }: { style?: ViewStyle }) {
  return (
    <View style={[styles.card, style]}>
      <View style={styles.row}>
        <Skeleton height={14} width="40%" />
        <Skeleton height={14} width="20%" />
      </View>
      <Skeleton height={10} width="60%" style={styles.mt} />
      <View style={[styles.row, styles.mt2]}>
        <Skeleton height={28} width="35%" />
        <Skeleton height={22} width="25%" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.surfaceCard,
    borderRadius: borderRadius.lg,
    padding: spacing.base,
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mt: { marginTop: spacing.xs },
  mt2: { marginTop: spacing.sm },
});
