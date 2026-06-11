import { useWindowDimensions, type ViewStyle } from 'react-native';
import { spacing } from '@/theme';

const TABLET_MIN_WIDTH = 768;
const TABLET_MAX_CONTENT_WIDTH = 720;

/**
 * Constrains readable width on tablets while keeping full-bleed backgrounds.
 */
export function useResponsiveLayout() {
  const { width } = useWindowDimensions();
  const isTablet = width >= TABLET_MIN_WIDTH;
  const contentMaxWidth = isTablet ? TABLET_MAX_CONTENT_WIDTH : undefined;

  const contentFrameStyle: ViewStyle | undefined = contentMaxWidth
    ? { maxWidth: contentMaxWidth, width: '100%', alignSelf: 'center' }
    : undefined;

  return {
    isTablet,
    contentMaxWidth,
    contentFrameStyle,
    contentHorizontalPadding: isTablet ? spacing.xl : spacing.base,
  };
}
