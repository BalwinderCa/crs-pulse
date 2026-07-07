import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCalculatorsStore } from '@/store/calculatorsStore';
import { STORAGE_KEYS } from '@/constants';
import type { FswInput } from '@/features/fsw/utils/fswCalculator';

const KEY = STORAGE_KEYS.CALCULATOR_INPUTS;

const clb = { speaking: 'clb9plus', listening: 'clb9plus', reading: 'clb9plus', writing: 'clb9plus' } as const;
const FSW_DEFAULT: FswInput = {
  age: 29,
  education: 'bachelors_3yr',
  firstLang: clb,
  secondLangClb5: false,
  workYears: '6plus',
  hasArrangedEmployment: false,
  spouseLangClb4: false,
  studiedInCanada: false,
  spouseStudiedInCanada: false,
  workedInCanada: false,
  spouseWorkedInCanada: false,
  hasRelativeInCanada: false,
};

beforeEach(async () => {
  await AsyncStorage.clear();
  useCalculatorsStore.setState({ fsw: null, sirs: null, sinp: null, loaded: false });
});

describe('calculatorsStore', () => {
  it('persists an input and reloads it', async () => {
    const input = { ...FSW_DEFAULT, age: 30 };
    useCalculatorsStore.getState().setFsw(input);

    expect(JSON.parse((await AsyncStorage.getItem(KEY))!).fsw.age).toBe(30);

    // Simulate a cold start: wipe memory, load from storage.
    useCalculatorsStore.setState({ fsw: null, loaded: false });
    await useCalculatorsStore.getState().load();
    expect(useCalculatorsStore.getState().fsw).toEqual(input);
  });

  it('setting one calculator does not clobber the others', async () => {
    useCalculatorsStore.getState().setFsw(FSW_DEFAULT);
    useCalculatorsStore.getState().setSinp({ foo: 1 } as never);

    const stored = JSON.parse((await AsyncStorage.getItem(KEY))!);
    expect(stored.fsw).not.toBeNull();
    expect(stored.sinp).not.toBeNull();
  });

  it('load tolerates missing/corrupt storage', async () => {
    await AsyncStorage.setItem(KEY, 'not json');
    await useCalculatorsStore.getState().load();
    expect(useCalculatorsStore.getState()).toMatchObject({ fsw: null, sirs: null, sinp: null, loaded: true });
  });

  it('clear wipes memory and storage', async () => {
    useCalculatorsStore.getState().setFsw(FSW_DEFAULT);
    await useCalculatorsStore.getState().clear();
    expect(useCalculatorsStore.getState().fsw).toBeNull();
    expect(await AsyncStorage.getItem(KEY)).toBeNull();
  });
});
