import { useState } from 'react';
import { useProfileStore } from '@/store/profileStore';
import Toast from 'react-native-toast-message';
import type { LocalProfile } from '@/store/profileStore';

export function useProfile() {
  const { profile } = useProfileStore();
  return {
    data: profile,
    isLoading: profile === null,
  };
}

export function useUpdateProfile() {
  const save = useProfileStore((s) => s.save);
  const [isPending, setIsPending] = useState(false);

  const mutate = async (payload: Partial<LocalProfile>) => {
    setIsPending(true);
    try {
      await save(payload);
      Toast.show({ type: 'success', text1: 'Settings saved.' });
    } catch {
      Toast.show({ type: 'error', text1: 'Save failed' });
    } finally {
      setIsPending(false);
    }
  };

  return { mutate, isPending };
}
