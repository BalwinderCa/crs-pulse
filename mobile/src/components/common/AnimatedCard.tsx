import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle } from 'react-native';
import { Card } from './Card';

type Props = {
  children: React.ReactNode;
  delay?: number;
  style?: ViewStyle;
};

export function AnimatedCard({ children, delay = 0, style }: Props) {
  const opacity     = useRef(new Animated.Value(0)).current;
  const translateY  = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 350,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 350,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay, opacity, translateY]);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      <Card style={style}>{children}</Card>
    </Animated.View>
  );
}
