// Unit test for prediction logic (local dashboard rules)

const STRONG_BUFFER   = 5;
const MODERATE_BUFFER = 10;

function predict(userScore: number, recentAverage: number, latestCutoff: number) {
  if (userScore >= recentAverage + STRONG_BUFFER) return 'strong';
  if (userScore >= latestCutoff - MODERATE_BUFFER) return 'moderate';
  return 'weak';
}

describe('Prediction rules', () => {
  it('strong when score >= average + 5', () => {
    expect(predict(530, 520, 518)).toBe('strong');
  });

  it('moderate when score is within 10 of cutoff', () => {
    expect(predict(515, 520, 518)).toBe('moderate');
  });

  it('weak when score is well below cutoff', () => {
    expect(predict(470, 520, 518)).toBe('weak');
  });

  it('handles exact boundary for strong', () => {
    expect(predict(525, 520, 518)).toBe('strong'); // exactly +5
  });

  it('handles score exactly at cutoff', () => {
    expect(predict(518, 520, 518)).toBe('moderate');
  });
});
