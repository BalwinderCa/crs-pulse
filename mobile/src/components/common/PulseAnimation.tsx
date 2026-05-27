import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';
import { palette } from '@/theme';

type Props = { style?: ViewStyle; size?: number; color?: string };

export function PulseAnimation({ style, size = 8, color = palette.blue }: Props) {
  const scale   = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.timing(scale,   { toValue: 2.5, duration: 1200, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0,   duration: 1200, useNativeDriver: true }),
      ]),
    ).start();
  }, [scale, opacity]);

  return (
    <View style={[{ width: size, height: size }, style]}>
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          { borderRadius: size / 2, backgroundColor: color, transform: [{ scale }], opacity },
        ]}
      />
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />
    </View>
  );
}
