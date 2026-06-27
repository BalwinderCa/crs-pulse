import Constants from 'expo-constants';

export const APP_NAME = 'CRS Pulse';
// Single source of truth: the version declared in app.config.js, so this never
// drifts from the built binary.
export const APP_VERSION = Constants.expoConfig?.version ?? '1.0.1';

/** Public URLs — no custom domain required; GitHub hosts the privacy policy. */
export const GITHUB_REPO_URL = 'https://github.com/BalwinderCa/crs-pulse';
export const PRIVACY_POLICY_URL =
  'https://www.crspulse.com/privacy';
/** Terms of Use (EULA) — required link on the IAP purchase surface (Apple 3.1.2).
 *  Served from the canonical domain (web/ builds terms.html → /terms), matching
 *  the privacy-policy host so both legal links share one stable origin. */
export const TERMS_OF_USE_URL = 'https://www.crspulse.com/terms';

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

/** Official IRCC "rounds of invitations" feed. The app fetches this directly
 *  (device IPs are accepted by canada.ca/Akamai, unlike datacenter egress). It
 *  carries both the draws and the pool composition (dd1..dd18 per round), so the
 *  pool is derived from it. The Immigration Levels Plan (annual, not in the
 *  feed) ships bundled in features/analytics/data/eePool.ts. */
export const IRCC_ROUNDS_FEED_URL =
  'https://www.canada.ca/content/dam/ircc/documents/json/ee_rounds_123_en.json';

export const STORAGE_KEYS = {
  USER_PROFILE: 'crs_pulse.user_profile',
  DRAWS_CACHE: 'crs_pulse.draws_cache_v2',
  PROCESSING_TIMES_CACHE: 'crs_pulse.processing_times_cache',
  // v2: pool is now derived live from the IRCC rounds feed (not the GitHub
  // mirror). Bumping the key invalidates stale pre-migration caches so existing
  // users re-derive fresh data instead of waiting out the 7-day window.
  EE_POOL_CACHE: 'crs_pulse.ee_pool_cache_v2',
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
 * Master monetization kill-switch. While `false` the app ships fully FREE:
 *   • no ads — AdMob never initializes (so no ATT prompt) and AdBanner renders nothing
 *   • the "Your Plan" analytics tab is unlocked for everyone
 *   • the paywall and "Upgrade to Premium" banner are hidden
 *
 * Temporarily disabled until monetization is permitted (work-permit/PR). Flip
 * back to `true` and ship a new build to re-enable ads + the one-time IAP unlock;
 * no other code changes are needed (every gate keys off this flag).
 */
export const MONETIZATION_ENABLED = false;

/**
 * AdMob banner ad-unit IDs (shown to free users; Premium removes ads).
 *
 * Set the EXPO_PUBLIC_ADMOB_BANNER_* env vars (wired in eas.json's production
 * env) to your real ad-unit IDs. When UNSET these are intentionally EMPTY: a
 * release build must NEVER fall back to Google's public *test* ad units — that
 * is an AdMob policy violation (and earns no revenue). AdBanner renders nothing
 * when the unit id is empty. In __DEV__ the AdBanner component forces the SDK's
 * built-in TestIds regardless of these values, so debug builds always serve
 * test ads (never live ones) without needing these set.
 */
export const ADMOB_BANNER_AD_UNIT = {
  android: process.env.EXPO_PUBLIC_ADMOB_BANNER_ANDROID || '',
  ios: process.env.EXPO_PUBLIC_ADMOB_BANNER_IOS || '',
} as const;
