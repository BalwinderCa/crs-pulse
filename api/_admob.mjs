// AdMob earnings for the ops dashboard, from the AdMob API's Network report.
// The API takes OAuth user credentials only (no service accounts), so the dashboard holds a
// refresh token for scope admob.readonly, created once by scripts/admob-setup.mjs:
// ADMOB_CLIENT_ID, ADMOB_CLIENT_SECRET, ADMOB_REFRESH_TOKEN, ADMOB_PUBLISHER_ID (pub-…).
// Dates are in the report's own time zone (AdMob uses Pacific time), not UTC like PostHog.

export const configured = (env = process.env) =>
  Boolean(env.ADMOB_CLIENT_ID && env.ADMOB_CLIENT_SECRET && env.ADMOB_REFRESH_TOKEN && env.ADMOB_PUBLISHER_ID);

// Only these apps count as CRS Pulse. The account also holds an unrelated app
// ("Revenue Analytics for AdMob"), which is reported separately as "other".
export const isCrsPulse = (label) => /crs pulse/i.test(label ?? '');

async function accessToken(env) {
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: env.ADMOB_CLIENT_ID,
      client_secret: env.ADMOB_CLIENT_SECRET,
      refresh_token: env.ADMOB_REFRESH_TOKEN,
    }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw new Error(`AdMob token ${r.status}: ${j.error ?? ''} ${j.error_description ?? ''}`.trim());
  return j.access_token;
}

/** Calendar date parts for `ms` in `tz`, shifted by `addDays`. */
export function ymd(ms, tz, addDays = 0) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' })
      .formatToParts(ms).filter((p) => p.type !== 'literal').map((p) => [p.type, Number(p.value)]),
  );
  const d = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + addDays));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}
export const iso = ({ year, month, day }) =>
  `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

/** Report spec: every day from the 1st of last month (or 29 days back, if earlier) to today. */
export function reportSpec(nowMs, tz = 'America/Los_Angeles') {
  const today = ymd(nowMs, tz);
  const back29 = ymd(nowMs, tz, -29);
  const lastMonth1 = today.month === 1 ? { year: today.year - 1, month: 12, day: 1 } : { year: today.year, month: today.month - 1, day: 1 };
  const start = iso(back29) < iso(lastMonth1) ? back29 : lastMonth1;
  return {
    dateRange: { startDate: start, endDate: today },
    dimensions: ['DATE', 'APP', 'FORMAT'],
    metrics: METRICS,
    localizationSettings: { currencyCode: 'CAD' },
  };
}

const METRICS = ['ESTIMATED_EARNINGS', 'IMPRESSIONS', 'AD_REQUESTS', 'MATCHED_REQUESTS', 'CLICKS'];

/** Spec for the last 30 days (Pacific) broken down by `dimensions`, e.g. COUNTRY or AD_UNIT. */
export function last30Spec(nowMs, dimensions, tz = 'America/Los_Angeles') {
  return {
    dateRange: { startDate: ymd(nowMs, tz, -29), endDate: ymd(nowMs, tz) },
    dimensions,
    metrics: METRICS,
    localizationSettings: { currencyCode: 'CAD' },
  };
}

/** Spec for whole months: the 1st of the month five months back, to today. */
export function monthsSpec(nowMs, tz = 'America/Los_Angeles') {
  const today = ymd(nowMs, tz);
  const back = new Date(Date.UTC(today.year, today.month - 1 - 5, 1));
  return {
    dateRange: { startDate: { year: back.getUTCFullYear(), month: back.getUTCMonth() + 1, day: 1 }, endDate: today },
    dimensions: ['MONTH', 'APP'],
    metrics: METRICS,
    localizationSettings: { currencyCode: 'CAD' },
  };
}

/** Turn the API's streamed [header, row…, footer] array into flat rows. */
export function parseReport(items) {
  const header = items.find((i) => i.header)?.header ?? {};
  const rows = items.filter((i) => i.row).map(({ row }) => {
    const d = row.dimensionValues ?? {};
    const m = row.metricValues ?? {};
    const int = (k) => Number(m[k]?.integerValue ?? 0);
    const date = d.DATE?.value ?? '';
    return {
      date: `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`,
      app: d.APP?.displayLabel ?? d.APP?.value ?? 'Unknown',
      format: d.FORMAT?.value ?? 'UNKNOWN',
      country: d.COUNTRY?.displayLabel ?? d.COUNTRY?.value ?? 'Unknown',
      adUnit: d.AD_UNIT?.displayLabel ?? d.AD_UNIT?.value ?? 'Unknown',
      month: d.MONTH?.value ? `${d.MONTH.value.slice(0, 4)}-${d.MONTH.value.slice(4, 6)}` : '',
      earnings: Number(m.ESTIMATED_EARNINGS?.microsValue ?? 0) / 1e6,
      impressions: int('IMPRESSIONS'),
      requests: int('AD_REQUESTS'),
      matched: int('MATCHED_REQUESTS'),
      clicks: int('CLICKS'),
    };
  });
  return {
    currency: header.localizationSettings?.currencyCode ?? 'CAD',
    timeZone: header.reportingTimeZone ?? 'America/Los_Angeles',
    rows,
  };
}

const sum = (rows, k) => rows.reduce((a, r) => a + r[k], 0);
const totals = (rows) => {
  const t = { earnings: sum(rows, 'earnings'), impressions: sum(rows, 'impressions'), requests: sum(rows, 'requests'), matched: sum(rows, 'matched'), clicks: sum(rows, 'clicks') };
  t.ecpm = t.impressions ? (t.earnings / t.impressions) * 1000 : 0;
  t.matchRate = t.requests ? t.matched / t.requests : 0;
  t.showRate = t.matched ? t.impressions / t.matched : 0;
  t.ctr = t.impressions ? t.clicks / t.impressions : 0;
  return t;
};
const round2 = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, typeof v === 'number' ? Math.round(v * 10000) / 10000 : v]));

/** Summaries for the dashboard. CRS Pulse apps only, except `other`. */
export function summarize(report, nowMs) {
  const tz = report.timeZone;
  const today = iso(ymd(nowMs, tz));
  const day = (n) => iso(ymd(nowMs, tz, n));
  const crs = report.rows.filter((r) => isCrsPulse(r.app));
  const inRange = (rows, from, to) => rows.filter((r) => r.date >= from && r.date <= to);
  const monthStart = `${today.slice(0, 7)}-01`;
  const [y, m] = today.split('-').map(Number);
  const lastMonthStart = m === 1 ? `${y - 1}-12-01` : `${y}-${String(m - 1).padStart(2, '0')}-01`;
  const lastMonthRows = crs.filter((r) => r.date >= lastMonthStart && r.date < monthStart);
  const platform = (app) => (/android/i.test(app) || /score & draws/i.test(app) ? 'Android' : 'iOS');

  const days = [];
  for (let n = -29; n <= 0; n++) {
    const d = day(n);
    const rows = crs.filter((r) => r.date === d);
    days.push({
      d,
      ios: Math.round(sum(rows.filter((r) => platform(r.app) === 'iOS'), 'earnings') * 100) / 100,
      android: Math.round(sum(rows.filter((r) => platform(r.app) === 'Android'), 'earnings') * 100) / 100,
      earnings: Math.round(sum(rows, 'earnings') * 100) / 100,
      impressions: sum(rows, 'impressions'),
      requests: sum(rows, 'requests'),
      matched: sum(rows, 'matched'),
      clicks: sum(rows, 'clicks'),
      ecpm: Math.round(totals(rows).ecpm * 100) / 100,
    });
  }
  const last7 = inRange(crs, day(-6), today);
  const formats = [...new Set(last7.map((r) => r.format))]
    .map((f) => ({ key: f, ...round2(totals(last7.filter((r) => r.format === f))) }))
    .sort((a, b) => b.earnings - a.earnings);
  const apps = [...new Set(last7.map((r) => r.app))]
    .map((a) => ({ key: a, ...round2(totals(last7.filter((r) => r.app === a))) }))
    .sort((a, b) => b.earnings - a.earnings);

  return {
    currency: report.currency,
    timeZone: tz,
    today: round2(totals(inRange(crs, today, today))),
    yesterday: round2(totals(inRange(crs, day(-1), day(-1)))),
    last7: round2(totals(last7)),
    prev7: round2(totals(inRange(crs, day(-13), day(-7)))),
    monthToDate: round2(totals(inRange(crs, monthStart, today))),
    lastMonth: round2(totals(lastMonthRows)),
    days,
    formats,
    apps,
    other7: round2(totals(inRange(report.rows.filter((r) => !isCrsPulse(r.app)), day(-6), today))),
    last30: round2(totals(inRange(crs, day(-29), today))),
  };
}

/** CRS Pulse rows of a breakdown report, totalled per `key`, biggest earner first. */
export function breakdown(report, key) {
  const crs = report.rows.filter((r) => isCrsPulse(r.app));
  return [...new Set(crs.map((r) => r[key]))]
    .map((k) => ({ key: k, ...round2(totals(crs.filter((r) => r[key] === k))) }))
    .sort((a, b) => b.earnings - a.earnings || b.impressions - a.impressions);
}

async function report(env, token, spec) {
  const r = await fetch(`https://admob.googleapis.com/v1/accounts/${env.ADMOB_PUBLISHER_ID}/networkReport:generate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ reportSpec: spec }),
  });
  if (!r.ok) throw new Error(`AdMob report ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return parseReport(await r.json());
}

export async function admobStats(env = process.env, nowMs = Date.now()) {
  const token = await accessToken(env);
  // The daily report is required; the breakdowns are extras, so one failing leaves the rest.
  const [daily, countries, adUnits, months] = await Promise.allSettled([
    report(env, token, reportSpec(nowMs)),
    report(env, token, last30Spec(nowMs, ['COUNTRY', 'APP'])),
    report(env, token, last30Spec(nowMs, ['AD_UNIT', 'APP'])),
    report(env, token, monthsSpec(nowMs)),
  ]);
  if (daily.status === 'rejected') throw daily.reason;
  const extra = (res, key) => {
    if (res.status === 'fulfilled') return breakdown(res.value, key);
    console.error(res.reason);
    return null;
  };
  return {
    ...summarize(daily.value, nowMs),
    countries: extra(countries, 'country'),
    adUnits: extra(adUnits, 'adUnit'),
    months: (extra(months, 'month') ?? null)?.sort((a, b) => a.key.localeCompare(b.key)) ?? null,
  };
}
