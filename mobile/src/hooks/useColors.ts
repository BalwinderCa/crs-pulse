import { useColorScheme } from 'react-native';
import { darkColors, lightColors, type Colors } from '@/theme/colors';
import { useProfileStore } from '@/store/profileStore';

export function useColors(): Colors {
  const resolved = useResolvedScheme();
  return resolved === 'light' ? lightColors : darkColors;
}

/**
 * The app's effective light/dark scheme — honours the user's in-app theme
 * setting, falling back to the system scheme only when set to 'system'. Use
 * this (not React Native's useColorScheme) for anything that must match the
 * app's appearance, e.g. native pickers' themeVariant.
 */
export function useResolvedScheme(): 'light' | 'dark' {
  const systemScheme = useColorScheme();
  const theme = useProfileStore(s => s.profile?.theme ?? 'system');

  const resolved = theme === 'system' ? systemScheme : theme;
  return resolved === 'dark' ? 'dark' : 'light';
}
