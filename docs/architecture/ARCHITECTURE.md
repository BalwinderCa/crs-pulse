# CRS Pulse — Architecture

## Structure

```
crs-pulse/
├── mobile/                          React Native (Expo SDK 52)
│   └── src/
│       ├── api/                     Axios client + per-endpoint modules
│       │   └── endpoints/           auth | draws | dashboard | analytics | notifications | profile
│       ├── components/              Shared UI (common | charts | forms | layout)
│       ├── features/                Feature modules (self-contained)
│       │   ├── auth/
│       │   ├── dashboard/
│       │   ├── draws/
│       │   ├── analytics/
│       │   ├── notifications/
│       │   ├── profile/
│       │   └── settings/
│       ├── navigation/              RootNavigator → AuthNavigator | MainNavigator
│       ├── store/                   Zustand: authStore | notificationStore
│       ├── hooks/                   Shared custom hooks
│       ├── services/                FCM, offline, prediction
│       ├── types/                   All TypeScript types (single source)
│       ├── constants/               App-wide constants
│       └── theme/                   Design tokens (palette, spacing, typography)
│
└── backend/                         Laravel 12 / PHP 8.4
    ├── app/
    │   ├── Http/Controllers/Api/V1/ Thin controllers (delegate to services)
    │   ├── Services/                Business logic (DrawService, PredictionService…)
    │   ├── Repositories/            DB abstraction (DrawRepository…)
    │   ├── Models/                  Eloquent models
    │   ├── Filament/                Admin panel resources
    │   ├── Jobs/                    SendDrawNotification, UpdateAnalyticsCache
    │   └── Notifications/           NewDrawNotification (FCM channel)
    ├── database/migrations/         Schema (see Phase 2)
    ├── routes/api.php               Versioned: /api/v1/*
    └── docker/                      nginx | php | mysql | redis
```

## Data Flow

```
Mobile App
  │
  ├─ React Query (server state) ──► API /api/v1/*
  │                                     │
  ├─ Zustand (auth, notif count)         ├─ Redis cache (draws, analytics)
  │                                     │
  └─ AsyncStorage (offline cache)        └─ MySQL (source of truth)
                                               │
Admin publishes draw ──► Filament ────► Queue ─┤
                                               └─► FCM → all subscribed devices
```

## API Versioning

All routes prefixed `/api/v1/`. V2 can be added alongside without breaking clients.

## Cache Strategy

| Resource    | TTL    | Layer         |
|-------------|--------|---------------|
| draws/list  | 5 min  | Redis + RQ    |
| dashboard   | 2 min  | Redis         |
| analytics   | 60 min | Redis         |
| notifications | 30s  | React Query   |

## Security

- Sanctum bearer tokens (30-day expiry, rotated on login)
- Rate limit: 60 req/min general, 10 req/min auth endpoints
- All inputs validated via FormRequest (Laravel) + Zod (mobile)
- No mass assignment (guarded models)
- SQL injection: Eloquent ORM only, no raw queries
