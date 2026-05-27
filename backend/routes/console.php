<?php

use App\Jobs\UpdateAnalyticsCacheJob;
use App\Services\AnalyticsService;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// ── Scheduler ───────────────────────────────────────────────────────────────

Schedule::job(new UpdateAnalyticsCacheJob())->hourly()->name('update-analytics-cache');
