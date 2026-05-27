<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Draw extends Model
{
    use HasFactory;

    protected $fillable = [
        'draw_number',
        'date',
        'category',
        'cutoff_score',
        'invitations_issued',
        'tie_breaking_rule',
        'notes',
        'is_published',
        'published_at',
    ];

    protected function casts(): array
    {
        return [
            'date'         => 'date',
            'is_published' => 'boolean',
            'published_at' => 'datetime',
        ];
    }

    public function scopePublished(Builder $query): Builder
    {
        return $query->where('is_published', true);
    }

    public function scopeForCategory(Builder $query, string $category): Builder
    {
        return $query->where('category', $category);
    }

    public function scopeLastMonth(Builder $query): Builder
    {
        return $query->where('date', '>=', now()->subMonth());
    }

    public function scopeLastYear(Builder $query): Builder
    {
        return $query->where('date', '>=', now()->subYear());
    }

    public function scopeLatest(Builder $query): Builder
    {
        return $query->orderByDesc('date')->orderByDesc('draw_number');
    }
}
