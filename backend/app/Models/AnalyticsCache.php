<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AnalyticsCache extends Model
{
    protected $table = 'analytics_cache';

    protected $fillable = [
        'category',
        'period',
        'average_cutoff',
        'highest_cutoff',
        'lowest_cutoff',
        'total_draws',
        'total_invitations',
        'trend',
        'trend_percentage',
        'chart_data',
        'computed_at',
    ];

    protected function casts(): array
    {
        return [
            'chart_data'       => 'array',
            'computed_at'      => 'datetime',
            'trend_percentage' => 'float',
        ];
    }
}
