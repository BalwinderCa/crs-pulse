import type { Milestone } from '@/store/timelineStore';
import {
  communityVisible, programFromTypeId, reachedIndex, sharedAorMonth, toSharedSteps, typicalPace, type SharedTimeline,
  randomAlias, stopOf,
} from '@/features/community/model';
import { MILESTONE_TYPES } from '@/features/timeline/milestoneMeta';

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

  it('shares the AOR month only, never the day, and never a future AOR', () => {
    expect(sharedAorMonth([m('ITA', '2026-03-01'), m('AOR Received', '2026-04-10')], today)).toBe('2026-04');
    expect(sharedAorMonth([m('AOR Received', '2026-12-01')], today)).toBeUndefined();
    expect(sharedAorMonth([m('ITA', '2026-03-01')], today)).toBeUndefined();
  });

  it('is live: release builds show Community too', () => {
    expect(communityVisible(false)).toBe(true);
    expect(communityVisible(true)).toBe(true);
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

describe('randomAlias', () => {
  it('makes a short handle with no look-alike digits', () => {
    for (let i = 0; i < 300; i++) {
      const a = randomAlias();
      expect(a).toMatch(/^[A-Z][a-z]+[A-Z][a-z]+[2689]{4}$/);
      expect(a.length).toBeLessThanOrEqual(24); // the name field's maxLength
    }
  });
});

describe('COPR milestone', () => {
  it('is listed last, after Final Decision and the two portals', () => {
    expect(MILESTONE_TYPES.slice(-5)).toEqual(['Final Decision', 'Portal 1', 'Portal 2', 'COPR', 'Custom']);
  });

  it('is shared and counts as the decision stop', () => {
    const steps = toSharedSteps(
      [{ id: '1', type: 'COPR', date: '2026-10-01', note: 'private' }],
      false,
      new Date(2026, 10, 1),
    );
    expect(steps).toEqual([{ type: 'COPR', day: 0 }]);
    expect(stopOf('COPR')).toBe('decision');
  });
});
