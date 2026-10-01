import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApplicationStore } from '@/store/applicationStore';
import { STORAGE_KEYS } from '@/constants';

const cec = { categoryId: 'economic', typeId: 'ee_cec', appliedDate: '2026-05-05' };
const prCard = { categoryId: 'pr_cards', typeId: 'pr_card_first', appliedDate: '2026-10-03' };

beforeEach(async () => {
  await AsyncStorage.clear();
  useApplicationStore.setState({ application: null, history: [], loaded: false });
});

describe('applicationStore next application', () => {
  it('files the decided application into history only when the next one is saved', async () => {
    await useApplicationStore.getState().save(cec);
    await useApplicationStore.getState().startNext(prCard, { decidedDate: '2026-08-25', coprDate: '2026-10-01' });

    const { application, history } = useApplicationStore.getState();
    expect(application).toEqual(prCard);
    expect(history).toEqual([{ ...cec, decidedDate: '2026-08-25', coprDate: '2026-10-01' }]);

    // persisted, and restored on the next launch
    useApplicationStore.setState({ application: null, history: [] });
    await useApplicationStore.getState().load();
    expect(useApplicationStore.getState().application).toEqual(prCard);
    expect(useApplicationStore.getState().history).toHaveLength(1);
  });

  it('keeps history newest first across several applications', async () => {
    await useApplicationStore.getState().save(cec);
    await useApplicationStore.getState().startNext(prCard, { decidedDate: '2026-08-25', coprDate: null });
    await useApplicationStore.getState().startNext({ categoryId: 'citizenship', typeId: 'citizenship', appliedDate: '2029-06-01' }, { decidedDate: '2026-11-10', coprDate: null });
    expect(useApplicationStore.getState().history.map((h) => h.typeId)).toEqual(['pr_card_first', 'ee_cec']);
  });

  it('removes one previous application and persists it', async () => {
    await useApplicationStore.getState().save(cec);
    await useApplicationStore.getState().startNext(prCard, { decidedDate: '2026-08-25', coprDate: null });
    await useApplicationStore.getState().removePast(0);
    expect(useApplicationStore.getState().history).toEqual([]);
    expect(useApplicationStore.getState().application).toEqual(prCard);
    expect(JSON.parse((await AsyncStorage.getItem(STORAGE_KEYS.APPLICATION_HISTORY)) ?? 'null')).toEqual([]);
  });

  it('reset wipes the current application and its history', async () => {
    await useApplicationStore.getState().save(cec);
    await useApplicationStore.getState().startNext(prCard, { decidedDate: '2026-08-25', coprDate: null });
    await useApplicationStore.getState().clear();
    expect(useApplicationStore.getState().history).toEqual([]);
    expect(await AsyncStorage.getItem(STORAGE_KEYS.APPLICATION_HISTORY)).toBeNull();
  });

  it('ignores corrupt history entries', async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.APPLICATION_HISTORY, JSON.stringify([{ nope: 1 }, { ...cec, decidedDate: null, coprDate: null }]));
    await useApplicationStore.getState().load();
    expect(useApplicationStore.getState().history).toHaveLength(1);
  });
});
