import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { CommunityTab } from '../../src/features/timeline/components/CommunityTab';
import { track } from '@/services/analyticsService';
import { STORAGE_KEYS } from '@/constants';

jest.mock('@/services/analyticsService', () => ({ track: jest.fn() }));

describe('CommunityTab', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  it('records interest once and then shows the joined state', async () => {
    const { getByText, queryByText } = render(<CommunityTab />);
    fireEvent.press(getByText('communityJoin'));

    await waitFor(() => expect(getByText('communityJoined')).toBeTruthy());
    expect(queryByText('communityJoin')).toBeNull();
    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith('community_interest');
    expect(await AsyncStorage.getItem(STORAGE_KEYS.COMMUNITY_INTEREST)).toBeTruthy();
  });

  it('remembers an earlier tap and sends nothing again', async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.COMMUNITY_INTEREST, '2026-11-15T00:00:00.000Z');
    const { findByText, queryByText } = render(<CommunityTab />);

    expect(await findByText('communityJoined')).toBeTruthy();
    expect(queryByText('communityJoin')).toBeNull();
    expect(track).not.toHaveBeenCalled();
  });
});
