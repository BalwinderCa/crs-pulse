import * as Notifications from 'expo-notifications';
import { setupPushListeners } from '@/services/pushService';
import { track } from '@/services/analyticsService';

jest.mock('@/services/analyticsService', () => ({ track: jest.fn() }));

type Listener = (payload: unknown) => void;
let received: Listener | undefined;
let response: Listener | undefined;
let lastResponse: unknown = null;

jest.mock('expo-notifications', () => ({
  addNotificationReceivedListener: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(),
  getLastNotificationResponseAsync: jest.fn(),
  clearLastNotificationResponseAsync: jest.fn(),
}));

const notif = (type: string) => ({ request: { content: { data: { type } } } });
const flush = () => new Promise((r) => setImmediate(r));

describe('setupPushListeners routing', () => {
  let handlers: { onNewDraw: jest.Mock; onProcessingTimes: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    lastResponse = null;
    handlers = { onNewDraw: jest.fn(), onProcessingTimes: jest.fn() };
    (Notifications.addNotificationReceivedListener as jest.Mock).mockImplementation((cb) => {
      received = cb;
      return { remove: jest.fn() };
    });
    (Notifications.addNotificationResponseReceivedListener as jest.Mock).mockImplementation((cb) => {
      response = cb;
      return { remove: jest.fn() };
    });
    (Notifications.getLastNotificationResponseAsync as jest.Mock).mockImplementation(
      async () => lastResponse,
    );
    (Notifications.clearLastNotificationResponseAsync as jest.Mock).mockResolvedValue(undefined);
  });

  it('routes a foreground processing_times push to its handler, not the draw one', () => {
    setupPushListeners(handlers);
    received!({ request: { content: { data: { type: 'processing_times' } } } });
    expect(handlers.onProcessingTimes).toHaveBeenCalledTimes(1);
    expect(handlers.onNewDraw).not.toHaveBeenCalled();
  });

  it('routes a tapped new_draw push to the draw handler', () => {
    setupPushListeners(handlers);
    response!({ notification: notif('new_draw') });
    expect(handlers.onNewDraw).toHaveBeenCalledTimes(1);
    expect(handlers.onProcessingTimes).not.toHaveBeenCalled();
  });

  it('ignores unknown push types', () => {
    setupPushListeners(handlers);
    received!({ request: { content: { data: { type: 'something_else' } } } });
    received!({ request: { content: {} } });
    expect(handlers.onNewDraw).not.toHaveBeenCalled();
    expect(handlers.onProcessingTimes).not.toHaveBeenCalled();
  });

  // The launch that matters most: tapping the alert from a cold start delivers
  // the response before any listener is registered.
  it('handles a cold-start tap and clears it so it fires only once', async () => {
    lastResponse = { notification: notif('processing_times') };
    setupPushListeners(handlers);
    await flush();
    expect(handlers.onProcessingTimes).toHaveBeenCalledTimes(1);
    expect(Notifications.clearLastNotificationResponseAsync).toHaveBeenCalledTimes(1);
  });

  it('does not fire the cold-start path after teardown', async () => {
    lastResponse = { notification: notif('processing_times') };
    setupPushListeners(handlers)();
    await flush();
    expect(handlers.onProcessingTimes).not.toHaveBeenCalled();
  });

  describe('push_opened', () => {
    const tap = (data: Record<string, unknown>, identifier = 'n1', actionIdentifier?: string) => ({
      ...(actionIdentifier ? { actionIdentifier } : {}),
      notification: { request: { identifier, content: { data } } },
    });

    it('records a tapped draw push with its draw number', () => {
      setupPushListeners(handlers);
      response!(tap({ type: 'new_draw', draw_number: '450', cutoff: '435', category: 'French' }));
      expect(track).toHaveBeenCalledTimes(1);
      expect(track).toHaveBeenCalledWith('push_opened', { type: 'new_draw', draw_number: 450 });
    });

    it('records other push types without extra properties', () => {
      setupPushListeners(handlers);
      response!(tap({ type: 'processing_times' }, 'a'));
      response!(tap({ type: 'mystery' }, 'b'));
      expect(track).toHaveBeenNthCalledWith(1, 'push_opened', { type: 'processing_times' });
      expect(track).toHaveBeenNthCalledWith(2, 'push_opened', { type: 'other' });
    });

    it('counts a cold-start tap once when the listener also delivers it', async () => {
      lastResponse = tap({ type: 'new_draw', draw_number: '450' }, 'same');
      setupPushListeners(handlers);
      response!(tap({ type: 'new_draw', draw_number: '450' }, 'same'));
      await flush();
      expect(track).toHaveBeenCalledTimes(1);
    });

    it('ignores non-default actions such as a dismiss', () => {
      setupPushListeners(handlers);
      response!(tap({ type: 'new_draw' }, 'd', 'expo.modules.notifications.actions.DISMISS'));
      expect(track).not.toHaveBeenCalled();
    });

    it('does not record foreground deliveries', () => {
      setupPushListeners(handlers);
      received!({ request: { content: { data: { type: 'new_draw' } } } });
      expect(track).not.toHaveBeenCalled();
    });
  });
});
