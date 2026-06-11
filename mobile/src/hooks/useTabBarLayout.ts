import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from '@/theme';

/** Icon row + label area inside the tab bar (excludes safe-area padding). */
export const TAB_BAR_CONTENT_HEIGHT = 56;
export const TAB_BAR_TOP_PADDING = spacing.sm;

/**
 * Shared layout metrics for bottom-tab screens.
 * Tab bar height must include the device bottom inset (gesture bar / home indicator).
 */
export function useTabBarLayout() {
  const insets = useSafeAreaInsets();
  const tabBarBottomPadding = Math.max(insets.bottom, spacing.sm);
  const tabBarHeight = TAB_BAR_CONTENT_HEIGHT + TAB_BAR_TOP_PADDING + tabBarBottomPadding;

  return {
    insets,
    tabBarHeight,
    tabBarBottomPadding,
    /** Scroll/list end padding on tab screens (breathing room below last item). */
    contentPaddingBottom: spacing['2xl'] + tabBarBottomPadding,
    /** Absolutely positioned UI that sits just above the tab bar. */
    floatingBottomOffset: spacing.sm,
    /** Scroll clearance when a floating card/pill sits above the tab bar (~70px tall). */
    floatingOverlayPaddingBottom: 72 + spacing.lg,
  };
}
