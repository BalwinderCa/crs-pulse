import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/constants';
import {
  DEFAULT_FILTERS, fetchCommunityPage, publishTimeline, unpublishTimeline,
} from '@/features/community/communityApi';

const URL = 'https://worker.test';
const body = { alias: 'Maple', program: 'cec' as const, steps: [{ type: 'ITA' as const, day: 0 }] };

function reply(status: number, json?: unknown) {
  return Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(json) } as Response);
}

describe('community api (server)', () => {
  const fetchMock = jest.fn();
  beforeEach(async () => {
    process.env.EXPO_PUBLIC_PUSH_URL = URL;
    global.fetch = fetchMock as unknown as typeof fetch;
    fetchMock.mockReset();
    await AsyncStorage.clear();
  });
  afterEach(() => { delete process.env.EXPO_PUBLIC_PUSH_URL; });

  it('first share keeps the key the server issues, and sends it next time', async () => {
    fetchMock.mockReturnValueOnce(reply(200, { id: 'row1', key: 'k'.repeat(64) }));
    await publishTimeline(body);
    const [, firstInit] = fetchMock.mock.calls[0];
    expect(firstInit.headers['X-Community-Key']).toBeUndefined();
    expect(JSON.parse((await AsyncStorage.getItem(STORAGE_KEYS.COMMUNITY_OWNER))!)).toEqual({ id: 'row1', key: 'k'.repeat(64) });

    fetchMock.mockReturnValueOnce(reply(200, { id: 'row1', key: 'k'.repeat(64) }));
    await publishTimeline(body);
    expect(fetchMock.mock.calls[1][1].headers['X-Community-Key']).toBe('k'.repeat(64));
  });

  it('marks your own row in the feed, and sends the filters', async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.COMMUNITY_OWNER, JSON.stringify({ id: 'me', key: 'x' }));
    fetchMock.mockReturnValueOnce(reply(200, { items: [{ id: 'me' }, { id: 'other' }], nextCursor: null }));
    const page = await fetchCommunityPage({ ...DEFAULT_FILTERS, program: 'cec', stage: 'ppr' }, null);
    expect(page.items.map((t) => !!t.isMine)).toEqual([true, false]);
    expect(fetchMock.mock.calls[0][0]).toBe(`${URL}/community?sort=recent&limit=20&program=cec&stage=ppr`);
  });

  it('keeps the key when stop sharing fails, and forgets it once the server confirms', async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.COMMUNITY_OWNER, JSON.stringify({ id: 'me', key: 'x' }));
    fetchMock.mockReturnValueOnce(reply(503));
    await expect(unpublishTimeline()).rejects.toThrow();
    expect(await AsyncStorage.getItem(STORAGE_KEYS.COMMUNITY_OWNER)).not.toBeNull();

    fetchMock.mockReturnValueOnce(reply(204));
    await unpublishTimeline();
    expect(await AsyncStorage.getItem(STORAGE_KEYS.COMMUNITY_OWNER)).toBeNull();
  });
});
