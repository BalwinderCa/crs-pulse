<?php

namespace App\Services;

use App\Models\Draw;
use Illuminate\Database\Eloquent\Collection;

class PredictionService
{
    private const STRONG_BUFFER   = 5;
    private const MODERATE_BUFFER = 10;

    public function predict(int $userScore, string $category, Collection $recentDraws): array
    {
        if ($recentDraws->isEmpty()) {
            return $this->buildResult('weak', $userScore, null, null);
        }

        $relevantDraws = $recentDraws->filter(
            fn (Draw $d) => $d->category === $category || $category === 'General'
        );

        if ($relevantDraws->isEmpty()) {
            $relevantDraws = $recentDraws;
        }

        $recentAverage = (int) round($relevantDraws->avg('cutoff_score'));
        $latestCutoff  = $relevantDraws->sortByDesc('date')->first()?->cutoff_score ?? $recentAverage;

        $gap = $userScore - $latestCutoff;

        if ($userScore >= $recentAverage + self::STRONG_BUFFER) {
            return $this->buildResult('strong', $userScore, null, null);
        }

        if ($userScore >= $latestCutoff - self::MODERATE_BUFFER) {
            $scoreNeeded = max(0, $latestCutoff - $userScore);
            return $this->buildResult('moderate', $userScore, $scoreNeeded, null);
        }

        $scoreNeeded    = $latestCutoff - $userScore;
        $estimatedDraws = (int) ceil($scoreNeeded / max(1, $this->avgScoreDrop($relevantDraws)));

        return $this->buildResult('weak', $userScore, $scoreNeeded, $estimatedDraws);
    }

    private function avgScoreDrop(Collection $draws): float
    {
        if ($draws->count() < 2) {
            return 5.0;
        }

        $sorted = $draws->sortByDesc('date')->values();
        $drops  = [];

        for ($i = 0; $i < $sorted->count() - 1; $i++) {
            $drops[] = abs($sorted[$i]->cutoff_score - $sorted[$i + 1]->cutoff_score);
        }

        return count($drops) > 0 ? array_sum($drops) / count($drops) : 5.0;
    }

    private function buildResult(
        string $strength,
        int $userScore,
        ?int $scoreNeeded,
        ?int $estimatedDraws,
    ): array {
        $labels = [
            'strong'   => 'High Chance',
            'moderate' => 'Moderate Chance',
            'weak'     => 'Long Wait',
        ];

        $descriptions = [
            'strong'   => 'Your score is well above the recent average. Expect an invitation soon.',
            'moderate' => 'Your score is close to the cutoff. A small improvement could help.',
            'weak'     => 'Your score is below recent cutoffs. Consider improving your profile.',
        ];

        return [
            'strength'        => $strength,
            'label'           => $labels[$strength],
            'description'     => $descriptions[$strength],
            'score_needed'    => $scoreNeeded,
            'estimated_draws' => $estimatedDraws,
        ];
    }
}
