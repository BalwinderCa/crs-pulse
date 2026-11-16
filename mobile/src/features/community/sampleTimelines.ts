import { addDays, differenceInCalendarDays, format } from 'date-fns';
import type { ProgramId, SharedStep, SharedTimeline } from './model';

/**
 * Made-up shared timelines for the dev preview of the Community feed, until a
 * server holds real ones. Aliases are invented; the paces are plausible but
 * are not IRCC data.
 */
const HAND_WRITTEN: SharedTimeline[] = [
  {
    id: 's1', alias: 'MapleBound', program: 'cec', updatedDaysAgo: 1,
    steps: [
      { type: 'ITA', day: 0, month: '2026-03' }, { type: 'Application Submitted', day: 21, month: '2026-03' },
      { type: 'AOR Received', day: 24, month: '2026-04' }, { type: 'Biometrics Completed', day: 33, month: '2026-04' },
      { type: 'Medical Passed', day: 41, month: '2026-04' }, { type: 'Passport Requested', day: 152, month: '2026-08' },
    ],
  },
  {
    id: 's2', alias: 'Anonymous applicant', program: 'cec', updatedDaysAgo: 3,
    steps: [
      { type: 'ITA', day: 0 }, { type: 'Application Submitted', day: 30 }, { type: 'AOR Received', day: 33 },
      { type: 'Biometrics Requested', day: 34 }, { type: 'Biometrics Completed', day: 47 },
    ],
  },
  {
    id: 's3', alias: 'TorontoTech', program: 'cec', updatedDaysAgo: 0,
    steps: [
      { type: 'ITA', day: 0, month: '2026-01' }, { type: 'Application Submitted', day: 18, month: '2026-01' },
      { type: 'AOR Received', day: 19, month: '2026-01' }, { type: 'Biometrics Completed', day: 28, month: '2026-02' },
      { type: 'Medical Passed', day: 40, month: '2026-02' }, { type: 'Passport Requested', day: 176, month: '2026-06' },
      { type: 'Portal 1', day: 181, month: '2026-07' }, { type: 'Final Decision', day: 190, month: '2026-07' },
    ],
  },
  {
    id: 's4', alias: 'NurseOnTheWay', program: 'fsw', updatedDaysAgo: 2,
    steps: [
      { type: 'ITA', day: 0, month: '2026-02' }, { type: 'Application Submitted', day: 45, month: '2026-03' },
      { type: 'AOR Received', day: 47, month: '2026-03' }, { type: 'Biometrics Completed', day: 70, month: '2026-04' },
      { type: 'Medical Passed', day: 82, month: '2026-05' }, { type: 'ADR', day: 160, month: '2026-07' },
    ],
  },
  {
    id: 's5', alias: 'Anonymous applicant', program: 'fsw', updatedDaysAgo: 6,
    steps: [
      { type: 'ITA', day: 0 }, { type: 'Application Submitted', day: 52 }, { type: 'AOR Received', day: 55 },
      { type: 'Biometrics Completed', day: 64 }, { type: 'Medical Passed', day: 90 },
      { type: 'Passport Requested', day: 205 },
    ],
  },
  {
    id: 's6', alias: 'PrairieDreams', program: 'pnp_ee', updatedDaysAgo: 4,
    steps: [
      { type: 'ITA', day: 0, month: '2026-04' }, { type: 'Application Submitted', day: 25, month: '2026-05' },
      { type: 'AOR Received', day: 27, month: '2026-05' }, { type: 'Biometrics Completed', day: 40, month: '2026-05' },
    ],
  },
  {
    id: 's7', alias: 'CalgaryChef', program: 'pnp_ee', updatedDaysAgo: 1,
    steps: [
      { type: 'ITA', day: 0 }, { type: 'Application Submitted', day: 14 }, { type: 'AOR Received', day: 15 },
      { type: 'Biometrics Completed', day: 26 }, { type: 'Medical Passed', day: 35 },
      { type: 'Passport Requested', day: 168 }, { type: 'Passport Submitted', day: 174 },
    ],
  },
  {
    id: 's8', alias: 'Anonymous applicant', program: 'fst', updatedDaysAgo: 9,
    steps: [
      { type: 'ITA', day: 0 }, { type: 'Application Submitted', day: 38 }, { type: 'AOR Received', day: 41 },
    ],
  },
];

// More made-up timelines, so the paged list and its filters have enough to
// work with. Seeded, so every run produces the same set.
const ALIASES = [
  'NorthernLights', 'PoutineFan', 'OttawaBound', 'WinnipegWaits', 'DevInVancouver', 'HalifaxHopeful',
  'MontrealMaple', 'ReginaRoad', 'LakeLouise', 'EdmontonEng', 'QuebecQuest', 'YukonYearner',
  'TimHortonsNext', 'SaskatoonSoon', 'VictoriaVibes', 'KitchenerCoder', 'MapleNurse', 'BanffBound',
];
const GAPS: [SharedStep['type'], number, number][] = [
  ['Application Submitted', 10, 50],
  ['AOR Received', 1, 5],
  ['Biometrics Completed', 7, 20],
  ['Medical Passed', 5, 30],
  ['Passport Requested', 90, 170],
  ['Passport Submitted', 3, 15],
  ['Portal 1', 2, 10],
  ['Final Decision', 2, 12],
];
const PROGRAM_POOL: ProgramId[] = ['cec', 'cec', 'cec', 'fsw', 'fsw', 'pnp_ee', 'pnp_ee', 'fst'];

function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function generate(count: number): SharedTimeline[] {
  const rand = rng(20261115);
  const int = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));
  const today = new Date(2026, 10, 15);
  return Array.from({ length: count }, (_, i) => {
    const ita = addDays(new Date(2025, 9, 1), int(0, 400));
    const showMonths = rand() < 0.6;
    const dates: { type: SharedStep['type']; date: Date }[] = [{ type: 'ITA', date: ita }];
    for (const [type, lo, hi] of GAPS) {
      const next = addDays(dates[dates.length - 1]!.date, int(lo, hi));
      if (next > today) break;
      dates.push({ type, date: next });
    }
    const last = dates[dates.length - 1]!.date;
    const steps = dates.map(({ type, date }) => {
      const step: SharedStep = { type, day: differenceInCalendarDays(date, ita) };
      if (showMonths) step.month = format(date, 'yyyy-MM');
      return step;
    });
    const aor = dates.find((d) => d.type === 'AOR Received');
    return {
      ...(aor ? { aorMonth: format(aor.date, 'yyyy-MM') } : {}),
      id: `g${i + 1}`,
      alias: rand() < 0.4 ? 'Anonymous applicant' : ALIASES[int(0, ALIASES.length - 1)]!,
      program: PROGRAM_POOL[int(0, PROGRAM_POOL.length - 1)]!,
      updatedDaysAgo: Math.min(differenceInCalendarDays(today, last), int(0, 30)),
      steps,
    };
  });
}

// Hand-written ones without months get a plausible AOR month for the filter.
const HAND_AOR: Record<string, string> = { s2: '2026-07', s5: '2026-04', s7: '2026-06', s8: '2026-09' };
const withAor = (t: SharedTimeline): SharedTimeline => {
  const m = t.steps.find((st) => st.type === 'AOR Received')?.month ?? HAND_AOR[t.id];
  return m ? { ...t, aorMonth: m } : t;
};

export const SAMPLE_TIMELINES: SharedTimeline[] = [...HAND_WRITTEN.map(withAor), ...generate(72)];
