import { StyleSheet, Text, View } from 'react-native';
import { typography } from '@/theme';

/**
 * CRS Pulse wordmark — brand colors from the app icon:
 * "CRS" in maple red, "Pulse" in pulse-line cyan.
 */

const RED = '#DC2626';
const CYAN = '#2BC8E8';

type Props = {
  /** Font size of the wordmark. */
  size?: number;
};

export function Logo({ size = 20 }: Props) {
  return (
    <View style={s.row} accessibilityRole="text" accessibilityLabel="CRS Pulse">
      <Text style={[s.word, { fontSize: size, color: CYAN }]}>CRS</Text>
      <Text style={[s.word, { fontSize: size, color: RED }]}> Pulse</Text>
    </View>
  );
}

const s = StyleSheet.create({
  row:  { flexDirection: 'row', alignItems: 'baseline' },
  word: { fontWeight: typography.black, letterSpacing: -0.5 },
});
