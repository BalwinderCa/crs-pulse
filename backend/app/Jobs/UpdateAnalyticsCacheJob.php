<?php

namespace App\Jobs;

use App\Services\AnalyticsService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class UpdateAnalyticsCacheJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries   = 2;
    public int $timeout = 60;

    public function handle(AnalyticsService $analytics): void
    {
        $categories = ['all', 'CEC', 'General', 'Healthcare', 'STEM', 'Trades', 'French'];
        $periods    = ['all', '1y', '6m', '3m'];

        foreach ($categories as $category) {
            foreach ($periods as $period) {
                $analytics->compute($category, $period);
            }
        }

        Log::info('Analytics cache updated', ['combinations' => count($categories) * count($periods)]);
    }
}
