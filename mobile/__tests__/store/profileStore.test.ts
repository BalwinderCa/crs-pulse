import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/constants';
import { useProfileStore, DEFAULT_PROFILE } from '@/store/profileStore';

async function loadWith(stored: Record<string, unknown>) {
  await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(stored));
  await useProfileStore.getState().load();
  return useProfileStore.getState().profile!;
}

describe('profileStore accent color', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useProfileStore.setState({ profile: null });
  });

  it('moves a stored teal accent (retired in 1.0.13) to green', async () => {
    expect((await loadWith({ accent_color: '#0D9488' })).accent_color).toBe('#059669');
    expect((await loadWith({ accent_color: '#0d9488' })).accent_color).toBe('#059669');
  });

  it('keeps an accent the picker still offers', async () => {
    expect((await loadWith({ accent_color: '#6366F1' })).accent_color).toBe('#6366F1');
  });

  it('falls back to the default when none is stored', async () => {
    expect((await loadWith({ theme: 'dark' })).accent_color).toBe(DEFAULT_PROFILE.accent_color);
  });
});
