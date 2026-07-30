import AsyncStorage from '@react-native-async-storage/async-storage';

const mockIsAvailable = jest.fn();
const mockRequestReview = jest.fn();

jest.mock('expo-store-review', () => ({
  isAvailableAsync: (...a: unknown[]) => mockIsAvailable(...a),
  requestReview: (...a: unknown[]) => mockRequestReview(...a),
}));

import { maybeAskForReview } from '../../src/services/reviewPrompt';

describe('reviewPrompt.maybeAskForReview — asks at most once', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    mockIsAvailable.mockResolvedValue(true);
    mockRequestReview.mockResolvedValue(undefined);
  });

  it('prompts on the first call and never again', async () => {
    await maybeAskForReview();
    await maybeAskForReview();
    await maybeAskForReview();

    expect(mockRequestReview).toHaveBeenCalledTimes(1);
  });

  it('does not prompt when the platform has no review action', async () => {
    mockIsAvailable.mockResolvedValue(false);

    await maybeAskForReview();

    expect(mockRequestReview).not.toHaveBeenCalled();
  });

  it('leaves the once-flag unset when the platform is unavailable, so a later capable launch can still ask', async () => {
    mockIsAvailable.mockResolvedValue(false);
    await maybeAskForReview();

    mockIsAvailable.mockResolvedValue(true);
    await maybeAskForReview();

    expect(mockRequestReview).toHaveBeenCalledTimes(1);
  });

  it('swallows a throwing review request rather than surfacing it to the caller', async () => {
    mockRequestReview.mockRejectedValue(new Error('SKStoreReviewController failed'));

    await expect(maybeAskForReview()).resolves.toBeUndefined();
  });
});
