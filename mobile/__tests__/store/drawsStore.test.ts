import { useDrawsStore } from '@/store/drawsStore';
import { useEePoolStore } from '@/store/eePoolStore';
import type { Draw } from '@/types';

// Silence the cross-module side effect (last-seen sync) — irrelevant here.
jest.mock('@/hooks/useDrawNotifications', () => ({
  syncLastSeenDraw: jest.fn().mockResolvedValue(undefined),
}));

const okJson = (body: unknown) =>
  Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) } as Response);

const seedDraw: Draw = {
  id: 410, draw_number: 410, date: '2026-01-01', category: 'CEC',
  cutoff_score: 500, invitations_issued: 1000, tie_breaking_rule: null,
  notes: null, created_at: '2026-01-01',
};

beforeEach(() => {
  useDrawsStore.setState({ draws: [], isLoading: false, isRefreshing: false, lastFetched: null, error: null });
  jest.restoreAllMocks();
});

describe('drawsStore.refresh (H2) — empty-feed guard', () => {
  it('keeps existing draws when a 200 response parses to zero rounds', async () => {
    useDrawsStore.setState({ draws: [seedDraw] });
    jest.spyOn(global, 'fetch').mockImplementation(() => okJson({ rounds: [] }));

    await useDrawsStore.getState().refresh();

    const state = useDrawsStore.getState();
    expect(state.draws).toEqual([seedDraw]); // cache preserved, not wiped to []
    expect(state.error).toBeTruthy();
  });

  it('still populates draws on a valid feed', async () => {
    jest.spyOn(global, 'fetch').mockImplementation(() =>
      okJson({
        rounds: [
          { drawNumber: '411', drawCRS: '505', drawSize: '1,500', drawDate: '2026-02-01', drawName: 'Canadian Experience Class' },
        ],
      }),
    );

    await useDrawsStore.getState().refresh();

    const state = useDrawsStore.getState();
    expect(state.draws).toHaveLength(1);
    expect(state.draws[0]?.draw_number).toBe(411);
    expect(state.error).toBeNull();
  });
});

describe('drawsStore & eePoolStore Unified Sync', () => {
  it('synchronizes pool store when draws are refreshed', async () => {
    const updateSpy = jest.spyOn(useEePoolStore.getState(), 'updateFromRounds').mockResolvedValue(undefined);

    const rounds = [
      { drawNumber: '411', drawCRS: '505', drawSize: '1,500', drawDate: '2026-02-01', drawName: 'Canadian Experience Class' },
    ];

    jest.spyOn(global, 'fetch').mockImplementation(() =>
      okJson({
        rounds,
      }),
    );

    await useDrawsStore.getState().refresh();

    expect(updateSpy).toHaveBeenCalledWith(rounds);
    updateSpy.mockRestore();
  });
});

