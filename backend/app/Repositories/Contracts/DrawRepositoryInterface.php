<?php

namespace App\Repositories\Contracts;

use App\Models\Draw;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;

interface DrawRepositoryInterface
{
    public function paginate(array $filters, int $perPage = 20): LengthAwarePaginator;

    public function latest(?string $category = null): ?Draw;

    public function forAnalytics(string $category, string $period): Collection;

    public function find(int $id): ?Draw;
}
