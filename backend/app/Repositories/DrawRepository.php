<?php

namespace App\Repositories;

use App\Models\Draw;
use App\Repositories\Contracts\DrawRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;

class DrawRepository implements DrawRepositoryInterface
{
    public function paginate(array $filters, int $perPage = 20): LengthAwarePaginator
    {
        $query = Draw::published()->latest();

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
        $query = Draw::published()->latest();

        if ($category && $category !== 'all') {
            $query->forCategory($category);
        }

        return $query->first();
    }

    public function forAnalytics(string $category, string $period): Collection
    {
        $query = Draw::published()->latest();

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
