import * as Notifications from 'expo-notifications';
import { setupPushListeners } from '@/services/pushService';

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
});
