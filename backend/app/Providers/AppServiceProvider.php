<?php

namespace App\Providers;

use App\Repositories\Contracts\DrawRepositoryInterface;
use App\Repositories\Contracts\UserRepositoryInterface;
use App\Repositories\DrawRepository;
use App\Repositories\UserRepository;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(DrawRepositoryInterface::class, DrawRepository::class);
        $this->app->bind(UserRepositoryInterface::class, UserRepository::class);
    }

    public function boot(): void
    {
        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute((int) config('app.rate_limit_per_minute', 60))
                ->by($request->user()?->id ?: $request->ip());
        });

        RateLimiter::for('auth', function (Request $request) {
            return Limit::perMinute((int) config('app.rate_limit_auth_per_minute', 10))
                ->by($request->ip());
        });
    }
}
