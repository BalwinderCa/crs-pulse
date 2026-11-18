import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/constants';
import {
  DEFAULT_FILTERS, blockTimeline, fetchCommunityPage, publishTimeline, reportTimeline, unpublishTimeline,
} from '@/features/community/communityApi';
import { useShareStore } from '@/features/community/shareStore';
import { useTimelineStore } from '@/store/timelineStore';
import { buddyChoices, isBuddyId, randomBuddyId } from '@/features/community/components/BuddyAvatar';

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

  it('drops blocked timelines from the feed', async () => {
    await blockTimeline('other');
    fetchMock.mockReturnValueOnce(reply(200, { items: [{ id: 'a' }, { id: 'other' }], nextCursor: null }));
    expect((await fetchCommunityPage(DEFAULT_FILTERS, null)).items.map((t) => t.id)).toEqual(['a']);
  });

  it('reports with the reason, and the device key when there is one', async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.COMMUNITY_OWNER, JSON.stringify({ id: 'me', key: 'secret' }));
    fetchMock.mockReturnValueOnce(reply(204));
    await reportTimeline('t1', 'spam');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${URL}/community/t1/report`);
    expect(JSON.parse(init.body)).toEqual({ reason: 'spam' });
    expect(init.headers['X-Community-Key']).toBe('secret');
  });

  it('a refused name puts the previous settings back', async () => {
    useTimelineStore.setState({ milestones: [{ id: '1', type: 'ITA', date: '2026-01-05', note: '' }] });
    useShareStore.setState({ settings: null, loaded: true });
    fetchMock.mockReturnValueOnce(reply(422, { message: 'alias not allowed' }));
    await expect(useShareStore.getState().share({ alias: 'IRCC Officer', program: 'cec', showMonths: false })).resolves.toBe('badName');
    expect(useShareStore.getState().settings).toBeNull();
    expect(await AsyncStorage.getItem(STORAGE_KEYS.COMMUNITY_SHARE)).toBeNull();

    fetchMock.mockReturnValueOnce(reply(503));
    await expect(useShareStore.getState().share({ alias: 'Maple', program: 'cec', showMonths: false })).resolves.toBe('offline');
    expect(useShareStore.getState().settings?.alias).toBe('Maple');
  });
});

describe('removing every milestone', () => {
  const fetchMock = jest.fn();
  beforeEach(async () => {
    process.env.EXPO_PUBLIC_PUSH_URL = URL;
    global.fetch = fetchMock as unknown as typeof fetch;
    fetchMock.mockReset();
    await AsyncStorage.clear();
  });
  afterEach(() => { delete process.env.EXPO_PUBLIC_PUSH_URL; });

  it('stops sharing, so a new milestone does not quietly re-share', async () => {
    const settings = { alias: 'Billy', program: 'cec' as const, showMonths: false, sharedAt: '2026-11-18' };
    await AsyncStorage.setItem(STORAGE_KEYS.COMMUNITY_OWNER, JSON.stringify({ id: 'me', key: 'k' }));
    await AsyncStorage.setItem(STORAGE_KEYS.COMMUNITY_SHARE, JSON.stringify(settings));
    useTimelineStore.setState({ milestones: [{ id: '1', type: 'ITA', date: '2026-01-05', note: '' }] });
    useShareStore.setState({ settings, loaded: true });

    fetchMock.mockReturnValue(reply(204));
    useTimelineStore.setState({ milestones: [] });
    await waitForCalls(1);
    await new Promise((r) => setTimeout(r, 0));
    expect(fetchMock.mock.calls[0][1].method).toBe('DELETE');
    expect(useShareStore.getState().settings).toBeNull();
    expect(await AsyncStorage.getItem(STORAGE_KEYS.COMMUNITY_SHARE)).toBeNull();

    useTimelineStore.setState({ milestones: [{ id: '2', type: 'ITA', date: '2026-02-01', note: '' }] });
    await new Promise((r) => setTimeout(r, 10));
    expect(fetchMock).toHaveBeenCalledTimes(1); // nothing re-published
  });

  async function waitForCalls(n: number) {
    for (let i = 0; i < 50 && fetchMock.mock.calls.length < n; i++) await new Promise((r) => setTimeout(r, 5));
  }
});

describe('buddy avatars', () => {
  it('makes valid, distinct ids and keeps the current one first', () => {
    for (let i = 0; i < 200; i++) expect(isBuddyId(randomBuddyId())).toBe(true);
    const ids = buddyChoices(15, 'b3201');
    expect(ids[0]).toBe('b3201');
    expect(new Set(ids).size).toBe(15);
    expect(isBuddyId('b9999')).toBe(false); // only 8 eyes
    expect(isBuddyId('b3201')).toBe(true); // ids shared before the extra part still work
    expect(isBuddyId('b97593')).toBe(true); // the newest of every part
    expect(isBuddyId('b97594')).toBe(false); // only 4 extras
    expect(isBuddyId('b320')).toBe(false);
    expect(isBuddyId(undefined)).toBe(false);
  });
});
