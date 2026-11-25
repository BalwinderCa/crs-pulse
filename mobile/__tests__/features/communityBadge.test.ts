import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  SETTINGS_NEW_MARK, timelineSignature, useCommunityBadgeStore,
} from '@/features/community/communityBadgeStore';
import * as api from '@/features/community/communityApi';
import type { SharedTimeline } from '@/features/community/model';

jest.mock('@/features/community/model', () => ({
  ...jest.requireActual('@/features/community/model'),
  communityVisible: () => true,
}));

const row = (id: string, days: number[], isMine = false): SharedTimeline => ({
  id, alias: id, program: 'cec', updatedDaysAgo: 0, isMine,
  steps: days.map((day, i) => ({ type: (['ITA', 'AOR Received', 'Biometrics Requested'] as const)[i]!, day })),
});

const hasNew = () => {
  const st = useCommunityBadgeStore.getState();
  return st.loaded && st.seen !== 'quiet-first' && st.latest !== null && st.latest !== st.seen;
};

describe('community badge', () => {
  let feed: SharedTimeline[];

  beforeEach(async () => {
    await AsyncStorage.clear();
    useCommunityBadgeStore.setState({ latest: null, seen: null, settingsSeen: null, loaded: false, checkedAt: 0 });
    feed = [row('a', [0, 20])];
    jest.spyOn(api, 'fetchCommunityPage').mockImplementation(async () => ({ items: feed, nextCursor: null }));
  });

  afterEach(() => jest.restoreAllMocks());

  it('shows a dot for activity not yet seen, and clears it once seen', async () => {
    const st = useCommunityBadgeStore.getState();
    await st.load(false);
    await st.check();
    expect(hasNew()).toBe(true);
    await st.markCommunitySeen();
    expect(hasNew()).toBe(false);
    expect(await AsyncStorage.getItem('crs_pulse.community_seen_top')).toBe(timelineSignature(feed[0]!));
  });

  it('comes back when someone shares or adds a step', async () => {
    const st = useCommunityBadgeStore.getState();
    await st.load(false);
    await st.check();
    await st.markCommunitySeen();

    feed = [row('a', [0, 20, 45])];
    await st.check(true);
    expect(hasNew()).toBe(true);
    await st.markCommunitySeen();

    feed = [row('b', [0]), row('a', [0, 20, 45])];
    await st.check(true);
    expect(hasNew()).toBe(true);
  });

  it("ignores the user's own timeline at the top of the feed", async () => {
    const st = useCommunityBadgeStore.getState();
    await st.load(false);
    await st.check();
    await st.markCommunitySeen();
    feed = [row('me', [0, 5], true), row('a', [0, 20])];
    await st.check(true);
    expect(hasNew()).toBe(false);
  });

  it('checks at most every 10 minutes unless forced, and keeps quiet offline', async () => {
    const st = useCommunityBadgeStore.getState();
    await st.load(false);
    await st.check();
    await st.check();
    expect(api.fetchCommunityPage).toHaveBeenCalledTimes(1);

    (api.fetchCommunityPage as jest.Mock).mockRejectedValueOnce(new Error('offline'));
    await st.check(true);
    expect(useCommunityBadgeStore.getState().latest).toBe(timelineSignature(feed[0]!));
  });

  it('the seen mark survives a restart', async () => {
    let st = useCommunityBadgeStore.getState();
    await st.load(false);
    await st.check();
    await st.markCommunitySeen();
    useCommunityBadgeStore.setState({ latest: null, seen: null, loaded: false, checkedAt: 0 });
    st = useCommunityBadgeStore.getState();
    await st.load(false);
    await st.check();
    expect(hasNew()).toBe(false);
  });

  it('a fresh install starts quiet, then dots for later activity', async () => {
    const st = useCommunityBadgeStore.getState();
    await st.load(true);
    expect(useCommunityBadgeStore.getState().settingsSeen).toBe(SETTINGS_NEW_MARK);
    await st.check();
    expect(hasNew()).toBe(false);
    feed = [row('b', [0]), ...feed];
    await st.check(true);
    expect(hasNew()).toBe(true);
  });

  it('a fresh install that went offline at first stays quiet after a restart', async () => {
    (api.fetchCommunityPage as jest.Mock).mockRejectedValueOnce(new Error('offline'));
    let st = useCommunityBadgeStore.getState();
    await st.load(true);
    await st.check();
    // Second launch: onboarding is done now, so it no longer looks like a fresh install.
    useCommunityBadgeStore.setState({ latest: null, seen: null, settingsSeen: null, loaded: false, checkedAt: 0 });
    st = useCommunityBadgeStore.getState();
    await st.load(false);
    await st.check();
    expect(hasNew()).toBe(false);
    expect(useCommunityBadgeStore.getState().settingsSeen).toBe(SETTINGS_NEW_MARK);
  });

  it('the Settings dot shows once, until Settings opens', async () => {
    const st = useCommunityBadgeStore.getState();
    await st.load(false);
    expect(useCommunityBadgeStore.getState().settingsSeen).toBeNull();
    await st.markSettingsSeen();
    expect(await AsyncStorage.getItem('crs_pulse.settings_new_seen')).toBe(SETTINGS_NEW_MARK);
  });
});
