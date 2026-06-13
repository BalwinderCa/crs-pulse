describe('errorReporter', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.resetModules();
    delete process.env.EXPO_PUBLIC_ERROR_REPORT_URL;
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('buffers reports locally and does not transmit when no endpoint is set', async () => {
    const fetchMock = jest.fn();
    (global as { fetch?: unknown }).fetch = fetchMock;

    const { reportError, getRecentErrors, clearRecentErrors } = require('../../src/services/errorReporter');
    clearRecentErrors();

    await reportError(new Error('boom'), { source: 'unit-test' });

    const recent = getRecentErrors();
    expect(recent).toHaveLength(1);
    expect(recent[0]).toMatchObject({ message: 'boom', source: 'unit-test', platform: expect.any(String) });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('never includes user data — only message/stack/meta', async () => {
    const { reportError, getRecentErrors, clearRecentErrors } = require('../../src/services/errorReporter');
    clearRecentErrors();
    await reportError(new Error('x'), { source: 's' });
    const keys = Object.keys(getRecentErrors()[0]).sort();
    expect(keys).toEqual(['appVersion', 'message', 'platform', 'source', 'stack', 'timestamp']);
  });

  it('coerces non-Error throwables to a message', async () => {
    const { reportError, getRecentErrors, clearRecentErrors } = require('../../src/services/errorReporter');
    clearRecentErrors();
    await reportError('string failure', { source: 's' });
    expect(getRecentErrors()[0].message).toBe('string failure');
  });

  it('bounds the ring buffer to 20 entries', async () => {
    const { reportError, getRecentErrors, clearRecentErrors } = require('../../src/services/errorReporter');
    clearRecentErrors();
    for (let i = 0; i < 25; i++) await reportError(new Error(`e${i}`), { source: 's' });
    const recent = getRecentErrors();
    expect(recent).toHaveLength(20);
    expect(recent[recent.length - 1].message).toBe('e24'); // newest retained
    expect(recent[0].message).toBe('e5'); // oldest evicted
  });

  it('transmit POSTs to the endpoint and swallows network failures', async () => {
    const fetchMock = jest.fn().mockRejectedValue(new Error('network down'));
    (global as { fetch?: unknown }).fetch = fetchMock;

    const { transmit } = require('../../src/services/errorReporter');
    const report = {
      message: 'boom',
      source: 's',
      appVersion: '1.0.1',
      platform: 'android',
      timestamp: new Date().toISOString(),
    };

    await expect(transmit(report, 'https://errors.example.com/report')).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://errors.example.com/report',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('installGlobalErrorHandler is idempotent and chains the previous handler', () => {
    const prev = jest.fn();
    let registered: ((e: unknown, fatal?: boolean) => void) | undefined;
    (globalThis as { ErrorUtils?: unknown }).ErrorUtils = {
      getGlobalHandler: () => prev,
      setGlobalHandler: (h: (e: unknown, fatal?: boolean) => void) => {
        registered = h;
      },
    };

    const { installGlobalErrorHandler } = require('../../src/services/errorReporter');
    installGlobalErrorHandler();
    installGlobalErrorHandler(); // second call is a no-op

    expect(registered).toBeDefined();
    const err = new Error('uncaught');
    registered!(err, true);
    expect(prev).toHaveBeenCalledWith(err, true);
  });
});
