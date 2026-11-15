import type { Milestone } from '@/store/timelineStore';
import {
  programFromTypeId, reachedIndex, toSharedSteps, typicalPace, type SharedTimeline,
} from '@/features/community/model';

const m = (type: Milestone['type'], date: string, extra: Partial<Milestone> = {}): Milestone =>
  ({ id: `${type}-${date}`, type, date, note: '', ...extra });

describe('community model', () => {
  const today = new Date(2026, 10, 15);

  it('shares only types and day offsets, dropping notes, customs and future steps', () => {
    const steps = toSharedSteps([
      m('AOR Received', '2026-04-10', { note: 'private note' }),
      m('ITA', '2026-03-01'),
      m('Custom', '2026-03-20', { customLabel: 'Called my lawyer' }),
      m('Passport Requested', '2026-12-01'), // future
    ], false, today);
    expect(steps).toEqual([{ type: 'ITA', day: 0 }, { type: 'AOR Received', day: 40 }]);
    expect(JSON.stringify(steps)).not.toMatch(/private|lawyer|2026-/);
  });

  it('adds the month only when the user allows it', () => {
    const steps = toSharedSteps([m('ITA', '2026-03-01'), m('AOR Received', '2026-04-10')], true, today);
    expect(steps.map((s) => s.month)).toEqual(['2026-03', '2026-04']);
  });

  it('returns nothing when there is nothing to share', () => {
    expect(toSharedSteps([m('Custom', '2026-03-01')], false, today)).toEqual([]);
  });

  it('maps tracker types to programs', () => {
    expect(programFromTypeId('ee_cec')).toBe('cec');
    expect(programFromTypeId('ee_pnp')).toBe('pnp_ee');
    expect(programFromTypeId(undefined)).toBe('other');
  });

  const tl = (steps: SharedTimeline['steps']): SharedTimeline => ({ id: 'x', alias: '', program: 'cec', steps, updatedDaysAgo: 0 });

  it('finds the furthest stop reached, ignoring ADR', () => {
    expect(reachedIndex(tl([{ type: 'ITA', day: 0 }, { type: 'Biometrics Completed', day: 30 }, { type: 'ADR', day: 90 }]))).toBe(2);
    expect(reachedIndex(tl([]))).toBe(-1);
  });

  it('takes the median first day of each stop', () => {
    const pace = typicalPace([
      tl([{ type: 'ITA', day: 0 }, { type: 'AOR Received', day: 20 }]),
      tl([{ type: 'ITA', day: 0 }, { type: 'AOR Received', day: 30 }, { type: 'Passport Requested', day: 150 }]),
      tl([{ type: 'ITA', day: 0 }, { type: 'AOR Received', day: 50 }]),
    ]);
    expect(pace).toEqual([{ stop: 'aor', day: 30, n: 3 }, { stop: 'ppr', day: 150, n: 1 }]);
  });
});
