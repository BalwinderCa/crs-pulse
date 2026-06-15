import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTimelineStore } from '@/store/timelineStore';

const KEY = 'timeline_milestones';

beforeEach(async () => {
  await AsyncStorage.clear();
  useTimelineStore.setState({ milestones: [] });
});

describe('timelineStore.clearAll (H1)', () => {
  it('removes all milestones from memory and storage', async () => {
    await useTimelineStore.getState().add({ type: 'ITA', date: '2026-01-01', note: 'a' });
    await useTimelineStore.getState().add({ type: 'AOR Received', date: '2026-02-01', note: 'b' });
    expect(useTimelineStore.getState().milestones).toHaveLength(2);
    expect(await AsyncStorage.getItem(KEY)).not.toBeNull();

    await useTimelineStore.getState().clearAll();

    expect(useTimelineStore.getState().milestones).toHaveLength(0);
    expect(await AsyncStorage.getItem(KEY)).toBeNull();
  });
});
