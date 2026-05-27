<?php

return [
    'name'     => env('APP_NAME', 'CRS Pulse API'),
    'env'      => env('APP_ENV', 'production'),
    'debug'    => (bool) env('APP_DEBUG', false),
    'url'      => env('APP_URL', 'http://localhost'),
    'timezone' => env('APP_TIMEZONE', 'America/Toronto'),
    'locale'   => env('APP_LOCALE', 'en'),
    'fallback_locale'  => env('APP_FALLBACK_LOCALE', 'en'),
    'faker_locale'     => env('APP_FAKER_LOCALE', 'en_CA'),
    'cipher'   => 'AES-256-CBC',
    'key'      => env('APP_KEY'),
    'previous_keys' => array_filter(explode(',', env('APP_PREVIOUS_KEYS', ''))),

    'rate_limit_per_minute'      => env('RATE_LIMIT_PER_MINUTE', 60),
    'rate_limit_auth_per_minute' => env('RATE_LIMIT_AUTH_PER_MINUTE', 10),
    'analytics_cache_ttl'        => env('ANALYTICS_CACHE_TTL', 3600),
    'draws_cache_ttl'            => env('DRAWS_CACHE_TTL', 300),

    'providers' => Illuminate\Support\ServiceProvider::defaultProviders()->merge([
        App\Providers\AppServiceProvider::class,
        App\Providers\AuthServiceProvider::class,
        Filament\FilamentServiceProvider::class,
        Livewire\LivewireServiceProvider::class,
    ])->toArray(),
];
