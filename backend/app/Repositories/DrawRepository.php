<?php

namespace App\Repositories;

use App\Models\Draw;
use App\Repositories\Contracts\DrawRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;

class DrawRepository implements DrawRepositoryInterface
{
    private function baseQuery()
    {
        // Use explicit orderByDesc to avoid conflict with Eloquent's built-in latest()
        return Draw::published()->orderByDesc('date')->orderByDesc('draw_number');
    }

    public function paginate(array $filters, int $perPage = 20): LengthAwarePaginator
    {
        $query = $this->baseQuery();

        if (! empty($filters['category']) && $filters['category'] !== 'all') {
            $query->forCategory($filters['category']);
        }

        if (! empty($filters['filter'])) {
            match ($filters['filter']) {
                'last_month' => $query->lastMonth(),
                'last_year'  => $query->lastYear(),
                default      => null,
            };
        }

        return $query->paginate($perPage);
    }

    public function latest(?string $category = null): ?Draw
    {
        $query = $this->baseQuery();

        if ($category && $category !== 'all') {
            $query->forCategory($category);
        }

        return $query->first();
    }

    public function forAnalytics(string $category, string $period): Collection
    {
        $query = $this->baseQuery();

        if ($category !== 'all') {
            $query->forCategory($category);
        }

        match ($period) {
            '3m' => $query->where('date', '>=', now()->subMonths(3)),
            '6m' => $query->where('date', '>=', now()->subMonths(6)),
            '1y' => $query->lastYear(),
            default => null,
        };

        return $query->get(['date', 'cutoff_score', 'invitations_issued', 'category']);
    }

    public function find(int $id): ?Draw
    {
        return Draw::published()->find($id);
    }
}
