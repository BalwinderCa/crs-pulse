export const APP_NAME = 'CRS Pulse';
export const APP_VERSION = '1.0.0';

export const CATEGORIES = ['CEC', 'General', 'Healthcare', 'STEM', 'Trades', 'French'] as const;

export const CATEGORY_LABELS: Record<string, string> = {
  CEC: 'Canadian Experience Class',
  General: 'No Category (General)',
  Healthcare: 'Healthcare Occupations',
  STEM: 'STEM Occupations',
  Trades: 'Trade Occupations',
  French: 'French Language Proficiency',
};

export const CRS_MIN = 0;
export const CRS_MAX = 1200;

export const DRAW_FILTERS = [
  { label: 'Last Month', value: 'last_month' },
  { label: 'Last Year', value: 'last_year' },
  { label: 'All Time', value: 'all' },
] as const;

export const PAGINATION_LIMIT = 20;

export const PREDICTION_LABELS = {
  strong: 'High Chance',
  moderate: 'Moderate Chance',
  weak: 'Long Wait',
} as const;

export const SCORE_STATUS = {
  above: 'above',
  near: 'near',
  below: 'below',
} as const;

export const NEAR_THRESHOLD = 10;

// SecureStore keys: alphanumeric + . - _ only (no @ or /)
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'crs_pulse.auth_token',
  USER_PROFILE: 'crs_pulse.user_profile',
  DRAWS_CACHE: 'crs_pulse.draws_cache',
  DASHBOARD_CACHE: 'crs_pulse.dashboard_cache',
  ANALYTICS_CACHE: 'crs_pulse.analytics_cache',
  ONBOARDING_COMPLETE: 'crs_pulse.onboarding_complete',
  FCM_TOKEN: 'crs_pulse.fcm_token',
} as const;

export const API_CACHE_KEYS = {
  DRAWS: 'draws',
  DASHBOARD: 'dashboard',
  ANALYTICS: 'analytics',
  NOTIFICATIONS: 'notifications',
  PROFILE: 'profile',
} as const;

export const QUERY_STALE_TIMES = {
  DRAWS: 5 * 60 * 1000,        // 5 min
  DASHBOARD: 2 * 60 * 1000,    // 2 min
  ANALYTICS: 10 * 60 * 1000,   // 10 min
  NOTIFICATIONS: 1 * 60 * 1000, // 1 min
  PROFILE: 5 * 60 * 1000,      // 5 min
} as const;
