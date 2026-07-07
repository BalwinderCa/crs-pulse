import { StyleSheet, Text, View } from 'react-native';
import { typography } from '@/theme';

/**
 * CRS Pulse wordmark — the full wordmark uses the brand pulse red.
 */

const RED = '#DC2626';

type Props = {
  /** Font size of the wordmark. */
  size?: number;
};

export function Logo({ size = 20 }: Props) {
  return (
    <View style={s.row} accessibilityRole="text" accessibilityLabel="CRS Pulse">
      <Text style={[s.word, { fontSize: size, color: RED }]}>CRS Pulse</Text>
    </View>
  );
}

const s = StyleSheet.create({
  row:  { flexDirection: 'row', alignItems: 'baseline' },
  word: { fontWeight: typography.black, letterSpacing: -0.5 },
});
