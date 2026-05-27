<?php

namespace App\Services;

use App\Jobs\SendDrawNotificationJob;
use App\Jobs\UpdateAnalyticsCacheJob;
use App\Models\Draw;
use App\Repositories\Contracts\DrawRepositoryInterface;

class DrawService
{
    public function __construct(private DrawRepositoryInterface $draws) {}

    public function publish(Draw $draw): Draw
    {
        $draw->update([
            'is_published' => true,
            'published_at' => now(),
        ]);

        dispatch(new SendDrawNotificationJob($draw));
        dispatch(new UpdateAnalyticsCacheJob());

        return $draw->fresh();
    }

    public function paginate(array $filters, int $perPage = 20)
    {
        return $this->draws->paginate($filters, $perPage);
    }

    public function latest(?string $category = null): ?Draw
    {
        return $this->draws->latest($category);
    }
}
