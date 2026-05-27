<?php

namespace App\Services;

use App\Models\AnalyticsCache;
use App\Repositories\Contracts\DrawRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;

class AnalyticsService
{
    public function __construct(private DrawRepositoryInterface $draws) {}

    public function get(string $category = 'all', string $period = 'all'): array
    {
        $cached = AnalyticsCache::where('category', $category)
            ->where('period', $period)
            ->where('computed_at', '>=', now()->subSeconds((int) config('app.analytics_cache_ttl', 3600)))
            ->first();

        if ($cached) {
            return $cached->toArray();
        }

        return $this->compute($category, $period);
    }

    public function compute(string $category = 'all', string $period = 'all'): array
    {
        $draws = $this->draws->forAnalytics($category, $period);

        if ($draws->isEmpty()) {
            return $this->emptyResult($category, $period);
        }

        $avgCutoff    = (int) round($draws->avg('cutoff_score'));
        $highCutoff   = (int) $draws->max('cutoff_score');
        $lowCutoff    = (int) $draws->min('cutoff_score');
        $totalDraws   = $draws->count();
        $totalInvites = (int) $draws->sum('invitations_issued');
        $trend        = $this->computeTrend($draws);
        $chartData    = $this->buildChartData($draws);

        $result = [
            'category'          => $category,
            'period'            => $period,
            'average_cutoff'    => $avgCutoff,
            'highest_cutoff'    => $highCutoff,
            'lowest_cutoff'     => $lowCutoff,
            'total_draws'       => $totalDraws,
            'total_invitations' => $totalInvites,
            'trend'             => $trend['direction'],
            'trend_percentage'  => $trend['percentage'],
            'chart_data'        => $chartData,
            'computed_at'       => now()->toDateTimeString(),
        ];

        AnalyticsCache::updateOrCreate(
            ['category' => $category, 'period' => $period],
            $result,
        );

        return $result;
    }

    private function computeTrend(Collection $draws): array
    {
        if ($draws->count() < 4) {
            return ['direction' => 'stable', 'percentage' => 0.0];
        }

        $sorted    = $draws->sortByDesc('date')->values();
        $half      = (int) ceil($sorted->count() / 2);
        $recent    = $sorted->take($half)->avg('cutoff_score');
        $older     = $sorted->skip($half)->avg('cutoff_score');

        if ($older == 0) {
            return ['direction' => 'stable', 'percentage' => 0.0];
        }

        $pct = round((($recent - $older) / $older) * 100, 2);

        return [
            'direction'  => match (true) {
                $pct > 1  => 'rising',
                $pct < -1 => 'falling',
                default   => 'stable',
            },
            'percentage' => abs($pct),
        ];
    }

    private function buildChartData(Collection $draws): array
    {
        return $draws
            ->sortBy('date')
            ->values()
            ->map(fn ($d) => [
                'date'        => $d->date instanceof \Carbon\Carbon
                    ? $d->date->format('Y-m-d')
                    : (string) $d->date,
                'cutoff'      => $d->cutoff_score,
                'invitations' => $d->invitations_issued,
            ])
            ->toArray();
    }

    private function emptyResult(string $category, string $period): array
    {
        return [
            'category'          => $category,
            'period'            => $period,
            'average_cutoff'    => 0,
            'highest_cutoff'    => 0,
            'lowest_cutoff'     => 0,
            'total_draws'       => 0,
            'total_invitations' => 0,
            'trend'             => 'stable',
            'trend_percentage'  => 0,
            'chart_data'        => [],
            'computed_at'       => now()->toDateTimeString(),
        ];
    }
}
