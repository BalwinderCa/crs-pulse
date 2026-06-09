import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';
import { borderRadius, spacing } from '@/theme';
import { useColors } from '@/hooks/useColors';
import type { Colors } from '@/theme/colors';

type SkeletonProps = {
  height?: number;
  width?: number | string;
  borderRadius?: number;
  style?: ViewStyle;
};

function SkeletonInner({ height = 16, width = '100%', borderRadius: br = 8, style, color }: SkeletonProps & { color: string }) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1,   duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[{ height, width: width as number, borderRadius: br, backgroundColor: color, opacity }, style]}
    />
  );
}

function makeStyles(c: Colors) {
  return StyleSheet.create({
    card: {
      backgroundColor: c.surfaceCard,
      borderRadius: borderRadius.md,
      padding: spacing.base,
      gap: spacing.xs,
    },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    mt:  { marginTop: spacing.xs },
    mt2: { marginTop: spacing.sm },
  });
}

export function Skeleton(props: SkeletonProps) {
  const colors = useColors();
  return <SkeletonInner {...props} color={colors.surfaceTertiary} />;
}

export function SkeletonCard({ style }: { style?: ViewStyle }) {
  const colors = useColors();
  const styles = makeStyles(colors);
  const skelColor = colors.surfaceTertiary;
  return (
    <View style={[styles.card, style]}>
      <View style={styles.row}>
        <SkeletonInner height={14} width="40%" color={skelColor} />
        <SkeletonInner height={14} width="20%" color={skelColor} />
      </View>
      <SkeletonInner height={10} width="60%" color={skelColor} style={styles.mt} />
      <View style={[styles.row, styles.mt2]}>
        <SkeletonInner height={28} width="35%" color={skelColor} />
        <SkeletonInner height={22} width="25%" color={skelColor} />
      </View>
    </View>
  );
}
