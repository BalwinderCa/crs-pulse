import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { typography } from '@/theme';

const RED = '#DC2626';

type Props = {
  size?: number;
};

export function Logo({ size = 20 }: Props) {
  const { t } = useTranslation();
  return (
    <View style={s.row} accessibilityRole="text" accessibilityLabel={t('common.appName')}>
      <Text style={[s.word, { fontSize: size, color: RED }]}>CRS Pulse</Text>
    </View>
  );
}

const s = StyleSheet.create({
  row:  { flexDirection: 'row', alignItems: 'baseline' },
  word: { fontWeight: typography.black, letterSpacing: -0.5 },
});
