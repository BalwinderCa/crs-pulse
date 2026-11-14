// App stats for the ops dashboard, from PostHog HogQL (project 632382). Aggregates only:
// no person IDs, IPs or cities ever leave this function. Days are UTC.
import { isAuthed, privateHeaders } from './_ops-auth.mjs';
import { admobStats, configured as admobConfigured } from './_admob.mjs';

const PROJECT = '632382';
const CACHE_MS = 10 * 60 * 1000;
let cache = null; // { at, data } — per warm instance; keeps us well under PostHog's query rate limit

// The app only, minus Apple App Review (Cupertino) and Google Play pre-launch devices.
const APP = `properties.$lib = 'posthog-react-native'
  AND coalesce(properties.$geoip_city_name, '') != 'Cupertino'
  AND coalesce(properties.$device_name, '') != 'OnePlus8Pro'`;
const DAY0 = 'toStartOfDay(now())';
const LAST30 = `timestamp >= ${DAY0} - INTERVAL 29 DAY`;
const THIS7 = `timestamp >= ${DAY0} - INTERVAL 6 DAY`;
const PREV7 = `timestamp >= ${DAY0} - INTERVAL 13 DAY AND timestamp < ${DAY0} - INTERVAL 6 DAY`;

export const QUERIES = {
  daily: `SELECT toString(toDate(timestamp)) d,
      count(DISTINCT person_id) users,
      countIf(event = 'Application Opened') opens,
      countIf(event = 'Application Installed') installs,
      countIf(event = 'ad_shown' AND properties.format = 'native') ads_native,
      countIf(event = 'ad_shown' AND properties.format = 'app_open') ads_app_open,
      countIf(event = 'push_opened') push_opened,
      countIf(event = 'milestone_added') milestones,
      countIf(event = 'crs_calculated') crs
    FROM events WHERE ${APP} AND ${LAST30} GROUP BY d ORDER BY d`,

  summary: `SELECT
      count(DISTINCT if(${THIS7}, person_id, NULL)) users_7,
      count(DISTINCT if(${PREV7}, person_id, NULL)) users_prev,
      countIf(${THIS7} AND event = 'Application Opened') opens_7,
      countIf(${PREV7} AND event = 'Application Opened') opens_prev,
      countIf(${THIS7} AND event = 'Application Installed') installs_7,
      countIf(${PREV7} AND event = 'Application Installed') installs_prev,
      count(DISTINCT if(${THIS7}, $session_id, NULL)) sessions_7,
      count(DISTINCT if(${PREV7}, $session_id, NULL)) sessions_prev,
      count(DISTINCT person_id) users_30
    FROM events WHERE ${APP} AND ${LAST30}`,

  breakdown: `SELECT 'os' kind, toString(properties.$os) k, count(DISTINCT person_id) n
      FROM events WHERE ${APP} AND ${THIS7} GROUP BY k
    UNION ALL SELECT 'country', toString(properties.$geoip_country_code), count(DISTINCT person_id)
      FROM events WHERE ${APP} AND ${THIS7} GROUP BY properties.$geoip_country_code
    UNION ALL SELECT 'version', toString(v), count() FROM
      (SELECT person_id, argMax(properties.$app_version, timestamp) v
         FROM events WHERE ${APP} AND ${THIS7} GROUP BY person_id) GROUP BY v
    UNION ALL SELECT 'screen', toString(properties.$screen_name), count(DISTINCT person_id)
      FROM events WHERE ${APP} AND ${THIS7} AND event = '$screen' GROUP BY properties.$screen_name
    UNION ALL SELECT 'event', event, count()
      FROM events WHERE ${APP} AND ${THIS7}
        AND event NOT LIKE '$%' AND event NOT LIKE 'Application%' GROUP BY event
    UNION ALL SELECT 'event_users', event, count(DISTINCT person_id)
      FROM events WHERE ${APP} AND ${THIS7}
        AND event NOT LIKE '$%' AND event NOT LIKE 'Application%' GROUP BY event
    UNION ALL SELECT 'days_active', toString(days), count() FROM
      (SELECT person_id, count(DISTINCT toDate(timestamp)) days
         FROM events WHERE ${APP} AND ${THIS7} GROUP BY person_id) GROUP BY days`,

  sessions: `SELECT count() n, round(quantile(0.5)(dur)) median_s, round(avg(dur)) mean_s FROM
      (SELECT $session_id, dateDiff('second', min(timestamp), max(timestamp)) dur
         FROM events WHERE ${APP} AND ${THIS7} AND $session_id IS NOT NULL GROUP BY $session_id)`,

  // Users whose install landed 8–30 days ago: did they come back in days 1–7, and after day 7?
  retention: `SELECT count() cohort, countIf(week1) week1, countIf(later) later FROM
      (SELECT person_id,
          max(timestamp > t + INTERVAL 1 DAY AND timestamp < t + INTERVAL 7 DAY) week1,
          max(timestamp >= t + INTERVAL 7 DAY) later
        FROM (SELECT person_id, timestamp,
                min(if(event = 'Application Installed', timestamp, NULL)) OVER (PARTITION BY person_id) t
              FROM events WHERE ${APP} AND timestamp >= ${DAY0} - INTERVAL 31 DAY)
        WHERE t IS NOT NULL AND t >= ${DAY0} - INTERVAL 30 DAY AND t < ${DAY0} - INTERVAL 8 DAY
        GROUP BY person_id)`,

  // The Settings "3 days without ads" rewarded ad (from the 2026-11-13 OTA): one rewarded_ad
  // event per tap on Watch ad, with result earned / dismissed / unavailable.
  rewardedDaily: `SELECT toString(toDate(timestamp)) d,
      countIf(properties.result = 'earned') earned,
      countIf(properties.result = 'dismissed') dismissed,
      countIf(properties.result = 'unavailable') unavailable
    FROM events WHERE ${APP} AND ${LAST30} AND event = 'rewarded_ad' GROUP BY d ORDER BY d`,

  rewardedSummary: `SELECT
      count() taps_all,
      countIf(properties.result = 'earned') earned_all,
      countIf(properties.result = 'dismissed') dismissed_all,
      countIf(properties.result = 'unavailable') unavailable_all,
      count(DISTINCT if(properties.result = 'earned', person_id, NULL)) earned_users_all,
      countIf(${THIS7}) taps_7,
      countIf(${THIS7} AND properties.result = 'earned') earned_7,
      countIf(${THIS7} AND properties.result = 'dismissed') dismissed_7,
      countIf(${THIS7} AND properties.result = 'unavailable') unavailable_7,
      count(DISTINCT if(${THIS7}, person_id, NULL)) tap_users_7,
      count(DISTINCT if(properties.result = 'earned' AND timestamp >= now() - INTERVAL 3 DAY, person_id, NULL)) ad_free_now,
      toString(min(timestamp)) first_at
    FROM events WHERE ${APP} AND event = 'rewarded_ad' AND timestamp >= '2026-11-13'`,

  // Who could see the offer: Settings viewers on 1.0.15 (the update only reaches 1.0.15).
  settingsReach: `SELECT count(DISTINCT person_id) users_7 FROM events
    WHERE ${APP} AND ${THIS7} AND event = '$screen' AND properties.$screen_name = 'Settings'
      AND properties.$app_version = '1.0.15'`,
};

async function hogql(key, query) {
  const r = await fetch(`https://us.posthog.com/api/projects/${PROJECT}/query/`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: { kind: 'HogQLQuery', query }, name: 'ops-dashboard' }),
  });
  if (!r.ok) throw new Error(`PostHog ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const { columns, results } = await r.json();
  return results.map((row) => Object.fromEntries(columns.map((c, i) => [c, row[i]])));
}

export function shape(raw) {
  const by = (kind) =>
    raw.breakdown
      .filter((r) => r.kind === kind)
      .map((r) => ({ key: r.k || 'Unknown', n: Number(r.n) }))
      .sort((a, b) => b.n - a.n);
  const eventUsers = Object.fromEntries(by('event_users').map((r) => [r.key, r.n]));
  return {
    daily: raw.daily.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, k === 'd' ? v : Number(v)]))),
    summary: Object.fromEntries(Object.entries(raw.summary[0] ?? {}).map(([k, v]) => [k, Number(v)])),
    os: by('os'),
    country: by('country'),
    version: by('version'),
    screen: by('screen'),
    events: by('event').map((r) => ({ ...r, users: eventUsers[r.key] ?? 0 })),
    daysActive: by('days_active').sort((a, b) => Number(a.key) - Number(b.key)),
    sessions: Object.fromEntries(Object.entries(raw.sessions[0] ?? {}).map(([k, v]) => [k, Number(v)])),
    retention: Object.fromEntries(Object.entries(raw.retention[0] ?? {}).map(([k, v]) => [k, Number(v)])),
    rewarded: {
      daily: raw.rewardedDaily.map((r) => ({ d: r.d, earned: Number(r.earned), dismissed: Number(r.dismissed), unavailable: Number(r.unavailable) })),
      ...Object.fromEntries(Object.entries(raw.rewardedSummary[0] ?? {}).map(([k, v]) => [k, k === 'first_at' ? (Number(raw.rewardedSummary[0]?.taps_all) ? v : null) : Number(v)])),
      settings_users_7: Number(raw.settingsReach[0]?.users_7 ?? 0),
    },
  };
}

export default async function handler(req, res) {
  privateHeaders(res);
  if (!isAuthed(req)) return res.status(401).json({ error: 'login' });
  const key = process.env.POSTHOG_PERSONAL_API_KEY;
  if (!key) return res.status(503).json({ error: 'not configured' });

  const now = Date.now();
  if (cache && now - cache.at < CACHE_MS) return res.status(200).json(cache.data);
  try {
    const names = Object.keys(QUERIES);
    // AdMob runs alongside PostHog; if it fails, the PostHog half still renders.
    const [rows, admob] = await Promise.all([
      Promise.all(names.map((n) => hogql(key, QUERIES[n]))),
      admobConfigured()
        ? admobStats().then((data) => ({ data }), (err) => { console.error(err); return { error: 'AdMob query failed' }; })
        : Promise.resolve({ error: 'AdMob not connected' }),
    ]);
    const data = {
      generatedAt: new Date(now).toISOString(),
      ...shape(Object.fromEntries(names.map((n, i) => [n, rows[i]]))),
      admob: admob.data ?? null,
      admobError: admob.error ?? null,
    };
    cache = { at: now, data };
    return res.status(200).json(data);
  } catch (err) {
    console.error(err);
    return res.status(502).json({ error: 'PostHog query failed' });
  }
}
