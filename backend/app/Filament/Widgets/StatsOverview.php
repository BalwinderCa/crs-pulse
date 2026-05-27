<?php

namespace App\Filament\Widgets;

use App\Models\Draw;
use App\Models\User;
use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;

class StatsOverview extends BaseWidget
{
    protected function getStats(): array
    {
        $latestDraw = Draw::published()->latest()->first();

        return [
            Stat::make('Total Users', User::count())
                ->icon('heroicon-o-users')
                ->color('primary'),

            Stat::make('Total Draws', Draw::published()->count())
                ->icon('heroicon-o-document-text')
                ->color('success'),

            Stat::make('Latest Cutoff', $latestDraw?->cutoff_score ?? 'N/A')
                ->description($latestDraw ? "Draw #{$latestDraw->draw_number} — {$latestDraw->category}" : 'No draws yet')
                ->icon('heroicon-o-chart-bar')
                ->color('warning'),

            Stat::make('Latest Draw Date', $latestDraw?->date?->format('M d, Y') ?? 'N/A')
                ->icon('heroicon-o-calendar')
                ->color('info'),
        ];
    }
}
