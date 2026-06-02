import { useColorScheme } from 'react-native';
import { darkColors, lightColors, type Colors } from '@/theme/colors';

export function useColors(): Colors {
  const scheme = useColorScheme();
  return scheme === 'light' ? lightColors : darkColors;
}
