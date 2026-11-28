import { navigationRef, openFromPush, flushPendingPush } from '@/navigation/pushNavigation';

describe('push navigation', () => {
  let ready = false;
  let current = 'Main';
  const navigate = jest.fn();
  const dispatch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    ready = false;
    current = 'Main';
    jest.spyOn(navigationRef, 'isReady').mockImplementation(() => ready);
    jest.spyOn(navigationRef, 'getCurrentRoute').mockImplementation(() => ({ key: 'k', name: current }) as never);
    navigationRef.navigate = navigate as never;
    navigationRef.dispatch = dispatch as never;
  });

  it('holds a cold-start tap until the navigator is ready, then goes once', () => {
    openFromPush({ screen: 'ProcessingTimes' });
    expect(navigate).not.toHaveBeenCalled();
    ready = true;
    flushPendingPush();
    flushPendingPush();
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith('ProcessingTimes');
  });

  it('opens the Draws tab and the Community month', () => {
    ready = true;
    openFromPush({ screen: 'Draws' });
    expect(dispatch.mock.calls[0][0].payload).toMatchObject({ name: 'Main', params: { screen: 'Draws' } });
    openFromPush({ screen: 'Community', aorMonth: '2026-05' });
    expect(dispatch.mock.calls[1][0].payload).toMatchObject({
      name: 'Main', params: { screen: 'Timeline', params: { community: { aorMonth: '2026-05' } } },
    });
  });

  it('does not skip onboarding', () => {
    ready = true;
    current = 'Onboarding';
    openFromPush({ screen: 'Draws' });
    expect(dispatch).not.toHaveBeenCalled();
  });
});
