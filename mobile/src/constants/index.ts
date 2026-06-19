import Constants from 'expo-constants';

export const APP_NAME = 'CRS Pulse';
// Single source of truth: the version declared in app.config.js, so this never
// drifts from the built binary.
export const APP_VERSION = Constants.expoConfig?.version ?? '1.0.1';

/** Public URLs — no custom domain required; GitHub hosts the privacy policy. */
export const GITHUB_REPO_URL = 'https://github.com/BalwinderCa/crs-pulse';
export const PRIVACY_POLICY_URL =
  'https://github.com/BalwinderCa/crs-pulse/blob/main/docs/PRIVACY_POLICY.md';
/** Terms of Use (EULA) — required link on the IAP purchase surface (Apple 3.1.2). */
export const TERMS_OF_USE_URL =
  'https://github.com/BalwinderCa/crs-pulse/blob/main/docs/TERMS_OF_USE.md';

export const CATEGORIES = ['CEC', 'General', 'Healthcare', 'STEM', 'Trades', 'French'] as const;

export const CATEGORY_LABELS: Record<string, string> = {
  CEC: 'Canadian Experience Class',
  General: 'No Category (General)',
  Healthcare: 'Healthcare Occupations',
  STEM: 'STEM Occupations',
  Trades: 'Trade Occupations',
  French: 'French Language Proficiency',
  PNP: 'Provincial Nominee Program',
  Agriculture: 'Agriculture & Agri-food',
  Education: 'Education Occupations',
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

/** GitHub-mirrored IRCC permanent-residence processing times (built by the
 *  ircc-mirror Action; canada.ca blocks worker/bot egress, GitHub runners pass). */
export const PROCESSING_TIMES_URL =
  'https://raw.githubusercontent.com/BalwinderCa/crs-pulse/main/data/processing-times.json';

/** GitHub-mirrored Express Entry pool composition + Immigration Levels Plan
 *  targets. IRCC publishes these periodically (no real-time feed), so the mirror
 *  is refreshed when a new snapshot is published; the app falls back to the
 *  bundled snapshot in features/analytics/data/eePool.ts when offline. */
export const EE_POOL_URL =
  'https://raw.githubusercontent.com/BalwinderCa/crs-pulse/main/data/ee-pool.json';

export const STORAGE_KEYS = {
  USER_PROFILE: 'crs_pulse.user_profile',
  DRAWS_CACHE: 'crs_pulse.draws_cache',
  PROCESSING_TIMES_CACHE: 'crs_pulse.processing_times_cache',
  EE_POOL_CACHE: 'crs_pulse.ee_pool_cache',
  DRAW_NOTIFICATIONS: 'crs_pulse.draw_notifications_enabled',
  LAST_SEEN_DRAW: 'crs_pulse.last_seen_draw_number',
  PUSH_TOKEN: 'crs_pulse.push_token',
  ONBOARDING_SEEN: 'crs_pulse.onboarding_seen',
  TRACKED_APPLICATION: 'crs_pulse.tracked_application',
  DOC_CHECKLIST: 'crs_pulse.doc_checklist',
  NOTIFICATIONS_SEEN_DRAW: 'crs_pulse.notifications_seen_draw',
  PREMIUM: 'crs_pulse.premium',
} as const;

/**
 * Google Play in-app products. `ANALYTICS_UNLOCK` is a one-time, non-consumable
 * managed product — buying it grants permanent access to the Analytics screen.
 * The id must match the product id created in the Play Console exactly.
 */
export const IAP_PRODUCTS = {
  ANALYTICS_UNLOCK: 'crs_pulse.analytics_unlock',
} as const;

export const IAP_SKUS: string[] = [IAP_PRODUCTS.ANALYTICS_UNLOCK];

/**
 * AdMob banner ad-unit IDs (shown to free users; Premium removes ads).
 *
 * Defaults are Google's PUBLIC TEST ad units, which always fill in dev/preview.
 * Set the EXPO_PUBLIC_ADMOB_BANNER_* env vars to your real ad-unit IDs for
 * production. In __DEV__ the AdBanner component always forces the test unit
 * regardless of these values, so debug builds never request live ads.
 */
const TEST_BANNER_ANDROID = 'ca-app-pub-3940256099942544/9214589741';
const TEST_BANNER_IOS = 'ca-app-pub-3940256099942544/2435281174';

export const ADMOB_BANNER_AD_UNIT = {
  android: process.env.EXPO_PUBLIC_ADMOB_BANNER_ANDROID || TEST_BANNER_ANDROID,
  ios: process.env.EXPO_PUBLIC_ADMOB_BANNER_IOS || TEST_BANNER_IOS,
} as const;
