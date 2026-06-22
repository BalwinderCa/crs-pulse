import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';
import { palette } from '@/theme';

type ToggleProps = {
  value: boolean;
  onValueChange: () => void;
  /** Track color when on. */
  activeColor: string;
  /** Track color when off. */
  inactiveColor?: string;
  accessibilityLabel?: string;
};

const TRACK_W = 48;
const TRACK_H = 28;
const PAD = 3;
const KNOB = TRACK_H - PAD * 2;

/**
 * Custom on/off toggle. Replaces React Native's <Switch>, whose native iOS
 * UISwitch renders an oversized, vertically-misaligned thumb under the New
 * Architecture (Fabric). This draws the track + knob in JS so it looks
 * identical on iOS and Android.
 */
export function Toggle({
  value,
  onValueChange,
  activeColor,
  inactiveColor = palette.gray400,
  accessibilityLabel,
}: ToggleProps) {
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: value ? 1 : 0,
      duration: 160,
      useNativeDriver: false,
    }).start();
  }, [value, anim]);

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, TRACK_W - KNOB - PAD * 2],
  });
  const backgroundColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [inactiveColor, activeColor],
  });

  return (
    <Pressable
      onPress={onValueChange}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
    >
      <Animated.View style={[s.track, { backgroundColor }]}>
        <Animated.View style={[s.knob, { transform: [{ translateX }] }]} />
      </Animated.View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  track: {
    width: TRACK_W,
    height: TRACK_H,
    borderRadius: TRACK_H / 2,
    padding: PAD,
    justifyContent: 'center',
  },
  knob: {
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    backgroundColor: palette.white,
  },
});
