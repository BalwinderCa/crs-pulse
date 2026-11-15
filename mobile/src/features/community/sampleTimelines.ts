import type { SharedTimeline } from './model';

/**
 * Made-up shared timelines for the dev preview of the Community feed, until a
 * server holds real ones. Aliases are invented; the paces are plausible but
 * are not IRCC data.
 */
export const SAMPLE_TIMELINES: SharedTimeline[] = [
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
