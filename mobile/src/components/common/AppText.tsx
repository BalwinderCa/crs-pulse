import React from 'react';
import { StyleSheet, Text as RNText, type TextProps } from 'react-native';
import { useProfileStore } from '@/store/profileStore';
import { fontFamilyFor } from '@/theme/fonts';
import { useIsPro } from '@/store/proStore';

/** react-native's Text in the font picked in Settings (Appearance → Font). */
export function Text({ style, ...rest }: TextProps) {
  const chosen = useProfileStore((s) => s.profile?.font ?? 'system');
  // Fonts are a Pro choice; without Pro text uses the system font (the choice stays saved).
  const font = useIsPro() ? chosen : 'system';
  const flat = StyleSheet.flatten(style);
  // An explicit fontFamily (e.g. a monospace digit) wins over the app font.
  const family = flat?.fontFamily ? null : fontFamilyFor(font, flat?.fontWeight);
  return (
    <RNText
      {...rest}
      style={family ? [style, { fontFamily: family, fontWeight: 'normal' }] : style}
    />
  );
}
