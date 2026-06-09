import { useColorScheme } from 'react-native';
import { darkColors, lightColors, type Colors } from '@/theme/colors';
import { useProfileStore } from '@/store/profileStore';

export function useColors(): Colors {
  const systemScheme = useColorScheme();
  const theme = useProfileStore(s => s.profile?.theme ?? 'system');

  const resolved = theme === 'system' ? systemScheme : theme;
  return resolved === 'light' ? lightColors : darkColors;
}
