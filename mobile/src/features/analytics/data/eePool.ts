/**
 * Express Entry pool composition + Immigration Levels Plan targets.
 *
 * Both are *periodic* publications:
 *   - Pool composition: embedded in every round of the IRCC "rounds of
 *     invitations" feed (dd1..dd18), refreshed every few weeks. `eePoolStore`
 *     derives it live from that feed via `derivePoolFromRounds` — the same feed
 *     the app fetches directly for draws (works on device IPs).
 *   - Levels Plan: published once a year (the 2025–2027 plan, Oct 2024) and NOT
 *     in the feed, so it ships bundled below.
 *
 * The values below are the bundled fallback/seed used until the live feed loads
 * (and for the always-bundled Levels Plan) — a dated, sourced snapshot, NOT
 * per-user invented numbers. The user's position (people ahead, candidates
 * at/above) is computed from THIS distribution against their real CRS.
 */

export interface PoolBand {
  /** Display label, e.g. "501–600". */
  band: string;
  /** Inclusive CRS lower bound for the band. */
  min: number;
  /** Inclusive CRS upper bound for the band. */
  max: number;
  /** Candidates in the pool within this band (IRCC snapshot). */
  count: number;
}

export interface LevelsPlan {
  year: number;
  /** Total permanent-resident admissions target for the year. */
  prTarget: number;
  /** Express Entry economic admissions target for the year. */
  eeTarget: number;
  /** Provincial Nominee Program admissions target for the year. */
  pnpTarget: number;
  /** PNP target for the previous year (for the "cut/raise" comparison). */
  pnpTargetPrev: number;
}

export interface EePoolData {
  /** Human-readable date of the IRCC snapshot, e.g. "January 8, 2026". */
  updated: string;
  /** Provenance string surfaced in the UI. */
  source: string;
  pool: {
    total: number;
    /** Highest band first. */
    distribution: PoolBand[];
  };
  levels: LevelsPlan;
}

/**
 * Bundled fallback/seed — last verified IRCC pool snapshot + 2025–2027 Levels
 * Plan. The pool is normally derived live from the rounds feed; refresh the
 * `levels` here when IRCC publishes a new annual plan. Keep `updated`/`source`
 * honest.
 */
export const EE_POOL_FALLBACK: EePoolData = {
  updated: 'June 22, 2026',
  source:
    'IRCC Express Entry pool composition (rounds of invitations) + 2025–2027 Immigration Levels Plan',
  pool: {
    total: 239_645,
    distribution: [
      { band: '601–1200', min: 601, max: 1200, count: 941 },
      { band: '501–600', min: 501, max: 600, count: 20_012 },
      { band: '451–500', min: 451, max: 500, count: 75_938 },
      { band: '401–450', min: 401, max: 450, count: 64_807 },
      { band: '351–400', min: 351, max: 400, count: 51_897 },
      { band: '0–350', min: 0, max: 350, count: 26_050 },
    ],
  },
  levels: {
    year: 2026,
    prTarget: 380_000,
    eeTarget: 124_680,
    pnpTarget: 55_000,
    pnpTargetPrev: 110_000,
  },
};

/**
 * Derive the live pool composition from the IRCC "rounds of invitations" feed —
 * the same feed the app already fetches directly for draws (works on device
 * IPs, unlike the datacenter-blocked GitHub mirror). Every round carries the
 * candidate counts by CRS range in dd1..dd18, "as of" that draw date.
 *
 * Verified mapping (sub-bands sum to their parent; all top bands sum to dd18):
 *   dd1 601–1200 · dd2 501–600 · dd3 451–500 · dd9 401–450
 *   dd15 351–400 · dd16 301–350 · dd17 0–300 · dd18 total
 *
 * The Levels Plan is not in the feed, so callers keep their own. Returns null
 * on a malformed/incomplete feed so the caller can keep its last-good data.
 */
export function derivePoolFromRounds(
  rounds: unknown,
): { updated: string; pool: EePoolData['pool'] } | null {
  if (!Array.isArray(rounds)) return null;

  let latest: Record<string, string> | null = null;
  for (const r of rounds as Record<string, string>[]) {
    const n = parseInt(r?.drawNumber ?? '', 10);
    if (!n) continue;
    if (!latest || n > parseInt(latest.drawNumber ?? '', 10)) latest = r;
  }
  if (!latest) return null;

  const num = (s: unknown) => parseInt(String(s ?? '').replace(/,/g, ''), 10);
  const b601 = num(latest.dd1);   // 601–1200
  const b501 = num(latest.dd2);   // 501–600
  const b451 = num(latest.dd3);   // 451–500
  const b401 = num(latest.dd9);   // 401–450
  const b351 = num(latest.dd15);  // 351–400
  const b301 = num(latest.dd16);  // 301–350
  const b0 = num(latest.dd17);    // 0–300
  const total = num(latest.dd18);

  const parts = [b601, b501, b451, b401, b351, b301, b0, total];
  if (parts.some((c) => !Number.isFinite(c))) return null;
  // Sanity: published bands must add up to the published total.
  if (b601 + b501 + b451 + b401 + b351 + b301 + b0 !== total) return null;

  return {
    updated: String(latest.drawDateFull || latest.drawDate || ''),
    pool: {
      total,
      distribution: [
        { band: '601–1200', min: 601, max: 1200, count: b601 },
        { band: '501–600', min: 501, max: 600, count: b501 },
        { band: '451–500', min: 451, max: 500, count: b451 },
        { band: '401–450', min: 401, max: 450, count: b401 },
        { band: '351–400', min: 351, max: 400, count: b351 },
        { band: '0–350', min: 0, max: 350, count: b301 + b0 },
      ],
    },
  };
}

export interface PoolPosition {
  /** Candidates strictly ranked above the user (higher CRS), estimated. */
  peopleAhead: number;
  /** Candidates at or above the user's CRS. */
  atOrAbove: number;
  poolTotal: number;
  /** Distribution with the user's own band flagged. */
  bands: (PoolBand & { mine: boolean })[];
}

/**
 * Estimate the user's place in the pool from a snapshot distribution.
 * Within the user's own band, candidates are assumed uniformly distributed, so
 * the count above the user is pro-rated by how far up the band their score sits.
 */
export function computePoolPosition(data: EePoolData, score: number): PoolPosition {
  const dist = data.pool.distribution;
  const poolTotal = data.pool.total || dist.reduce((s, b) => s + b.count, 0);

  let peopleAhead = 0;
  let atOrAbove = 0;
  const bands = dist.map((b) => {
    const mine = score >= b.min && score <= b.max;
    if (b.min > score) {
      // Entire band ranks above the user.
      peopleAhead += b.count;
      atOrAbove += b.count;
    } else if (mine) {
      // Pro-rate the user's own band by position within it.
      const span = Math.max(1, b.max - b.min);
      const fractionAbove = Math.min(1, Math.max(0, (b.max - score) / span));
      peopleAhead += Math.round(b.count * fractionAbove);
      atOrAbove += b.count; // everyone in the band counts as "at or above"
    }
    return { ...b, mine };
  });

  return {
    peopleAhead: Math.round(peopleAhead),
    atOrAbove: Math.round(atOrAbove),
    poolTotal,
    bands,
  };
}

export function isEePoolData(v: unknown): v is EePoolData {
  if (!v || typeof v !== 'object') return false;
  const d = v as EePoolData;
  return (
    !!d.pool &&
    Array.isArray(d.pool.distribution) &&
    d.pool.distribution.length > 0 &&
    !!d.levels &&
    typeof d.levels.prTarget === 'number'
  );
}
