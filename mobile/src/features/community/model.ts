import { differenceInCalendarDays, format, isValid, parseISO } from 'date-fns';
import type { Milestone, MilestoneType } from '@/store/timelineStore';

/**
 * Community timelines: what a shared timeline looks like, how the user's own
 * milestones become one, and the "typical pace" figures the feed shows.
 *
 * Privacy by construction: a shared timeline holds only milestone *types* and
 * day offsets from its first step (plus, if the user allows it, the month and
 * year of each step). Notes, custom milestones and exact dates never go in.
 */

/** Go live with a server behind it. Until then real users see the waitlist. */
export const COMMUNITY_LIVE = false;

export type ProgramId = 'cec' | 'fsw' | 'fst' | 'pnp_ee' | 'pnp' | 'aip' | 'other';

/** Short program codes shown on cards; `other` is translated. */
export const PROGRAMS: { id: ProgramId; code: string }[] = [
  { id: 'cec', code: 'CEC' },
  { id: 'fsw', code: 'FSW' },
  { id: 'fst', code: 'FST' },
  { id: 'pnp_ee', code: 'PNP (EE)' },
  { id: 'pnp', code: 'PNP' },
  { id: 'aip', code: 'AIP' },
  { id: 'other', code: '' },
];

/** The tracker's application type → community program. */
export function programFromTypeId(typeId: string | undefined): ProgramId {
  switch (typeId) {
    case 'ee_cec': return 'cec';
    case 'ee_fsw': return 'fsw';
    case 'ee_fst': return 'fst';
    case 'ee_pnp': return 'pnp_ee';
    case 'pnp_paper': return 'pnp';
    case 'aip': return 'aip';
    default: return 'other';
  }
}

export type SharedStep = {
  type: Exclude<MilestoneType, 'Custom'>;
  /** Days since the timeline's first step. */
  day: number;
  /** "2026-03" when the owner chose to show months; absent otherwise. */
  month?: string;
};

export type SharedTimeline = {
  id: string;
  alias: string;
  program: ProgramId;
  steps: SharedStep[];
  /** Days since the owner last updated it. */
  updatedDaysAgo: number;
  isMine?: boolean;
};

// The journey every card draws as a track, in order. Each milestone type maps
// onto one of these stops; ADR has no stop of its own (it can come any time).
export const STOPS = ['ita', 'aor', 'bio', 'medical', 'ppr', 'decision'] as const;
export type Stop = (typeof STOPS)[number];

const STOP_OF: Partial<Record<MilestoneType, Stop>> = {
  'ITA': 'ita',
  'Application Submitted': 'ita',
  'AOR Received': 'aor',
  'Biometrics Requested': 'bio',
  'Biometrics Completed': 'bio',
  'Medical Requested': 'medical',
  'Medical Passed': 'medical',
  'Passport Requested': 'ppr',
  'Passport Submitted': 'ppr',
  'Passport Collected': 'ppr',
  'Portal 1': 'decision',
  'Portal 2': 'decision',
  'Final Decision': 'decision',
};

export const stopOf = (type: MilestoneType): Stop | undefined => STOP_OF[type];

/** Index into STOPS of the furthest stop reached, or -1. */
export function reachedIndex(t: SharedTimeline): number {
  return t.steps.reduce((max, s) => {
    const stop = stopOf(s.type);
    return stop ? Math.max(max, STOPS.indexOf(stop)) : max;
  }, -1);
}

/** The step the owner is at now: the latest one. */
export const currentStep = (t: SharedTimeline): SharedStep | undefined => t.steps[t.steps.length - 1];

/**
 * The user's milestones as a shareable timeline. Custom milestones and notes are
 * dropped, future-dated steps are left out, and days count from the first step
 * (normally the ITA).
 */
export function toSharedSteps(milestones: Milestone[], showMonths: boolean, today: Date = new Date()): SharedStep[] {
  const dated = milestones
    .filter((m) => m.type !== 'Custom')
    .map((m) => ({ type: m.type as SharedStep['type'], date: parseISO(m.date) }))
    .filter((m) => isValid(m.date) && differenceInCalendarDays(today, m.date) >= 0)
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  const first = dated[0];
  if (!first) return [];
  return dated.map((m) => {
    const step: SharedStep = { type: m.type, day: differenceInCalendarDays(m.date, first.date) };
    if (showMonths) step.month = format(m.date, 'yyyy-MM');
    return step;
  });
}

/** Median of the first day each stop was reached, over the timelines that reached it. */
export function typicalPace(timelines: SharedTimeline[]): { stop: Stop; day: number; n: number }[] {
  return STOPS.slice(1).flatMap((stop) => {
    const days = timelines
      .map((t) => t.steps.find((s) => stopOf(s.type) === stop)?.day)
      .filter((d): d is number => d !== undefined)
      .sort((a, b) => a - b);
    if (days.length === 0) return [];
    const mid = Math.floor(days.length / 2);
    const median = days.length % 2 ? days[mid]! : Math.round((days[mid - 1]! + days[mid]!) / 2);
    return [{ stop, day: median, n: days.length }];
  });
}
