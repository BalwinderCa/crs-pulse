import { Image, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { typography } from '@/theme';

const RED = '#DC2626';
// The maple-leaf mark from the app icon (same crop the website header uses).
const MARK = require('../../../assets/logo-mark.png');

type Props = {
  size?: number;
};

export function Logo({ size = 20 }: Props) {
  const { t } = useTranslation();
  const mark = Math.round(size * 1.3);
  return (
    <View style={s.row} accessibilityRole="text" accessibilityLabel={t('common.appName')}>
      <Image source={MARK} style={{ width: mark, height: mark, borderRadius: Math.round(mark * 0.26), marginRight: Math.round(size * 0.4) }} accessibilityIgnoresInvertColors />
      <Text style={[s.word, { fontSize: size, color: RED }]}>CRS Pulse</Text>
    </View>
  );
}

const s = StyleSheet.create({
  row:  { flexDirection: 'row', alignItems: 'center' },
  word: { fontWeight: typography.black, letterSpacing: -0.5 },
});
