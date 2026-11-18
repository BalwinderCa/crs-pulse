import * as Font from 'expo-font';

export type AppFont = 'system' | 'inter' | 'manrope' | 'dmsans' | 'jakarta';

type Weight = '400' | '500' | '600' | '700' | '800';

// Custom fonts have one family per weight (Android won't synthesize bold), so
// AppText swaps fontWeight for the matching family. 900 falls back to 800.
const FILES: Record<Exclude<AppFont, 'system'>, Record<Weight, number>> = {
  inter: {
    '400': require('@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf'),
    '500': require('@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf'),
    '600': require('@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf'),
    '700': require('@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf'),
    '800': require('@expo-google-fonts/inter/800ExtraBold/Inter_800ExtraBold.ttf'),
  },
  manrope: {
    '400': require('@expo-google-fonts/manrope/400Regular/Manrope_400Regular.ttf'),
    '500': require('@expo-google-fonts/manrope/500Medium/Manrope_500Medium.ttf'),
    '600': require('@expo-google-fonts/manrope/600SemiBold/Manrope_600SemiBold.ttf'),
    '700': require('@expo-google-fonts/manrope/700Bold/Manrope_700Bold.ttf'),
    '800': require('@expo-google-fonts/manrope/800ExtraBold/Manrope_800ExtraBold.ttf'),
  },
  dmsans: {
    '400': require('@expo-google-fonts/dm-sans/400Regular/DMSans_400Regular.ttf'),
    '500': require('@expo-google-fonts/dm-sans/500Medium/DMSans_500Medium.ttf'),
    '600': require('@expo-google-fonts/dm-sans/600SemiBold/DMSans_600SemiBold.ttf'),
    '700': require('@expo-google-fonts/dm-sans/700Bold/DMSans_700Bold.ttf'),
    '800': require('@expo-google-fonts/dm-sans/800ExtraBold/DMSans_800ExtraBold.ttf'),
  },
  jakarta: {
    '400': require('@expo-google-fonts/plus-jakarta-sans/400Regular/PlusJakartaSans_400Regular.ttf'),
    '500': require('@expo-google-fonts/plus-jakarta-sans/500Medium/PlusJakartaSans_500Medium.ttf'),
    '600': require('@expo-google-fonts/plus-jakarta-sans/600SemiBold/PlusJakartaSans_600SemiBold.ttf'),
    '700': require('@expo-google-fonts/plus-jakarta-sans/700Bold/PlusJakartaSans_700Bold.ttf'),
    '800': require('@expo-google-fonts/plus-jakarta-sans/800ExtraBold/PlusJakartaSans_800ExtraBold.ttf'),
  },
};

export const FONT_OPTIONS: { value: AppFont; label: string }[] = [
  { value: 'system',  label: 'System' },
  { value: 'inter',   label: 'Inter' },
  { value: 'manrope', label: 'Manrope' },
  { value: 'dmsans',  label: 'DM Sans' },
  { value: 'jakarta', label: 'Jakarta' },
];

export function isAppFont(v: unknown): v is AppFont {
  return FONT_OPTIONS.some((o) => o.value === v);
}

const loaded = new Set<AppFont>(['system']);

/** Loads every weight of `font`. False on failure, so callers keep the system font. */
export async function loadAppFont(font: AppFont): Promise<boolean> {
  if (loaded.has(font)) return true;
  try {
    const files = FILES[font as Exclude<AppFont, 'system'>];
    await Font.loadAsync(Object.fromEntries(
      Object.entries(files).map(([w, file]) => [`${font}-${w}`, file]),
    ));
    loaded.add(font);
    return true;
  } catch {
    return false;
  }
}

function toWeight(w: unknown): Weight {
  const n = w === 'bold' ? 700 : Number(w) || 400;
  if (n >= 800) return '800';
  if (n >= 700) return '700';
  if (n >= 600) return '600';
  if (n >= 500) return '500';
  return '400';
}

/** The family for `font` at `weight`, or null for the system font / a font not yet loaded. */
export function fontFamilyFor(font: AppFont, weight: unknown): string | null {
  if (font === 'system' || !loaded.has(font)) return null;
  return `${font}-${toWeight(weight)}`;
}
