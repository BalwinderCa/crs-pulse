import AsyncStorage from '@react-native-async-storage/async-storage';

const mockIsAvailable = jest.fn();
const mockRequestReview = jest.fn();

jest.mock('expo-store-review', () => ({
  isAvailableAsync: (...a: unknown[]) => mockIsAvailable(...a),
  requestReview: (...a: unknown[]) => mockRequestReview(...a),
}));

import { track } from '@/services/analyticsService';

jest.mock('@/services/analyticsService', () => ({ track: jest.fn() }));

import {
  maybeAskForReview,
  recordPositiveMoment,
  REVIEW_MIN_AGE_MS,
} from '../../src/services/reviewPrompt';

describe('reviewPrompt.maybeAskForReview — asks at most once', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    mockIsAvailable.mockResolvedValue(true);
    mockRequestReview.mockResolvedValue(undefined);
  });

  it('prompts on the first call and never again', async () => {
    await maybeAskForReview('checklist');
    await maybeAskForReview('checklist');
    await maybeAskForReview('checklist');

    expect(mockRequestReview).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith('review_requested', { trigger: 'checklist' });
  });

  it('does not prompt when the platform has no review action', async () => {
    mockIsAvailable.mockResolvedValue(false);

    await maybeAskForReview('checklist');

    expect(mockRequestReview).not.toHaveBeenCalled();
  });

  it('leaves the once-flag unset when the platform is unavailable, so a later capable launch can still ask', async () => {
    mockIsAvailable.mockResolvedValue(false);
    await maybeAskForReview('checklist');

    mockIsAvailable.mockResolvedValue(true);
    await maybeAskForReview('checklist');

    expect(mockRequestReview).toHaveBeenCalledTimes(1);
  });

  it('swallows a throwing review request rather than surfacing it to the caller', async () => {
    mockRequestReview.mockRejectedValue(new Error('SKStoreReviewController failed'));

    await expect(maybeAskForReview('checklist')).resolves.toBeUndefined();
    expect(track).not.toHaveBeenCalled();
  });
});

describe('reviewPrompt.recordPositiveMoment — asks on the third good moment, two days in', () => {
  const T0 = 1_760_000_000_000;

  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    mockIsAvailable.mockResolvedValue(true);
    mockRequestReview.mockResolvedValue(undefined);
  });

  it('does not ask before the third moment, even when the install is old', async () => {
    await recordPositiveMoment({}, T0);
    await recordPositiveMoment({}, T0 + REVIEW_MIN_AGE_MS * 5);

    expect(mockRequestReview).not.toHaveBeenCalled();
  });

  it('does not ask on the third moment within two days of the first', async () => {
    await recordPositiveMoment({}, T0);
    await recordPositiveMoment({}, T0 + 1000);
    await recordPositiveMoment({}, T0 + REVIEW_MIN_AGE_MS - 1);

    expect(mockRequestReview).not.toHaveBeenCalled();
  });

  it('asks on the next allowed moment once both conditions hold, and only once', async () => {
    await recordPositiveMoment({}, T0);
    await recordPositiveMoment({}, T0 + 1000);
    await recordPositiveMoment({}, T0 + 2000);
    await recordPositiveMoment({}, T0 + REVIEW_MIN_AGE_MS);
    await recordPositiveMoment({}, T0 + REVIEW_MIN_AGE_MS * 2);

    expect(mockRequestReview).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith('review_requested', { trigger: 'moments' });
  });

  it('counts ask:false moments without asking, then asks at the next allowed one', async () => {
    await recordPositiveMoment({ ask: false }, T0);
    await recordPositiveMoment({ ask: false }, T0 + REVIEW_MIN_AGE_MS);
    await recordPositiveMoment({ ask: false }, T0 + REVIEW_MIN_AGE_MS);
    expect(mockRequestReview).not.toHaveBeenCalled();

    await recordPositiveMoment({}, T0 + REVIEW_MIN_AGE_MS);
    expect(mockRequestReview).toHaveBeenCalledTimes(1);
  });

  it('stops counting once a review has been asked for elsewhere', async () => {
    await maybeAskForReview('checklist');
    for (let i = 0; i < 5; i++) await recordPositiveMoment({}, T0 + REVIEW_MIN_AGE_MS * (i + 1));

    expect(mockRequestReview).toHaveBeenCalledTimes(1);
  });

  it('recovers from a corrupt stored counter instead of throwing', async () => {
    await AsyncStorage.setItem('crs_pulse.review_moments', '{not json');

    await expect(recordPositiveMoment({}, T0)).resolves.toBeUndefined();
  });
});
