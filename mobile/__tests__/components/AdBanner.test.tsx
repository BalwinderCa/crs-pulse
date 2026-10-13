import React from 'react';
import { View } from 'react-native';
import { act, render } from '@testing-library/react-native';

const mockCreateForAdRequest = jest.fn();
const mockUseIsFocused = jest.fn(() => true);

jest.mock('@/constants', () => ({
  MONETIZATION_ENABLED: true,
  ADMOB_BANNER_AD_UNIT: { ios: 'banner-ios', android: 'banner-android' },
  ADMOB_NATIVE_AD_UNIT: { ios: 'native-ios', android: 'native-android' },
}));
jest.mock('@react-navigation/native', () => ({ useIsFocused: () => mockUseIsFocused() }));
jest.mock('@/services/analyticsService', () => ({ track: jest.fn() }));
jest.mock(
  'react-native-google-mobile-ads',
  () => {
    const { View } = jest.requireActual('react-native');
    return {
      TestIds: { NATIVE: 'test-native' },
      NativeAd: { createForAdRequest: (...args: unknown[]) => mockCreateForAdRequest(...args) },
      NativeAdView: View,
      NativeAsset: ({ children }: { children: React.ReactElement }) => children,
      NativeAssetType: {},
    };
  },
  { virtual: true },
);

import { AdBanner } from '@/components/common/AdBanner';
import { track } from '@/services/analyticsService';

// Jest's View mock carries its native methods on the prototype.
const measureInWindow = jest.spyOn(View.prototype, 'measureInWindow');

type MeasureCallback = (x: number, y: number, width: number, height: number) => void;
const placeSlotAt = (y: number, width = 300) =>
  measureInWindow.mockImplementation((cb: MeasureCallback) => cb(0, y, width, 1));

const AD = { headline: 'Headline', body: 'Body', callToAction: 'Open', advertiser: null, icon: null, destroy: jest.fn() };

describe('AdBanner', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockUseIsFocused.mockReturnValue(true);
    mockCreateForAdRequest.mockResolvedValue(AD);
  });
  afterEach(() => jest.useRealTimers());

  it('does not request an ad while the slot is far below the screen', () => {
    placeSlotAt(5000);
    render(<AdBanner />);
    act(() => jest.advanceTimersByTime(2000));
    expect(mockCreateForAdRequest).not.toHaveBeenCalled();
  });

  it('requests one ad once the slot scrolls onto the screen', async () => {
    placeSlotAt(5000);
    const { getByText } = render(<AdBanner />);
    act(() => jest.advanceTimersByTime(1000));
    expect(mockCreateForAdRequest).not.toHaveBeenCalled();

    placeSlotAt(300);
    await act(async () => {
      jest.advanceTimersByTime(500);
    });
    expect(getByText('Headline')).toBeTruthy();
    act(() => jest.advanceTimersByTime(2000));
    expect(mockCreateForAdRequest).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith('ad_shown', { format: 'native' });
  });

  it('does not request an ad while its screen is unfocused', () => {
    mockUseIsFocused.mockReturnValue(false);
    placeSlotAt(300);
    render(<AdBanner />);
    act(() => jest.advanceTimersByTime(2000));
    expect(mockCreateForAdRequest).not.toHaveBeenCalled();
  });

  it('does not request an ad before the slot is laid out', () => {
    placeSlotAt(0, 0);
    render(<AdBanner />);
    act(() => jest.advanceTimersByTime(2000));
    expect(mockCreateForAdRequest).not.toHaveBeenCalled();
  });
});
