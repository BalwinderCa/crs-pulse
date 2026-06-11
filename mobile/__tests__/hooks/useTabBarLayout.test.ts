import { renderHook } from '@testing-library/react-native';
import {
  TAB_BAR_CONTENT_HEIGHT,
  TAB_BAR_TOP_PADDING,
  useTabBarLayout,
} from '@/hooks/useTabBarLayout';
import { spacing } from '@/theme';

describe('useTabBarLayout', () => {
  it('computes tab bar height from content area and bottom inset', () => {
    const { result } = renderHook(() => useTabBarLayout());
    const bottomPadding = Math.max(0, spacing.sm);

    expect(result.current.tabBarBottomPadding).toBe(bottomPadding);
    expect(result.current.tabBarHeight).toBe(
      TAB_BAR_CONTENT_HEIGHT + TAB_BAR_TOP_PADDING + bottomPadding,
    );
    expect(result.current.contentPaddingBottom).toBe(spacing['2xl'] + bottomPadding);
  });
});
