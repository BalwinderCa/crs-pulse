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

export const STORAGE_KEYS = {
  USER_PROFILE: 'crs_pulse.user_profile',
  DRAWS_CACHE: 'crs_pulse.draws_cache',
  DRAW_NOTIFICATIONS: 'crs_pulse.draw_notifications_enabled',
  LAST_SEEN_DRAW: 'crs_pulse.last_seen_draw_number',
  PUSH_TOKEN: 'crs_pulse.push_token',
} as const;
