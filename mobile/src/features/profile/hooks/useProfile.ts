import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { profileApi } from '@/api';
import { API_CACHE_KEYS, QUERY_STALE_TIMES } from '@/constants';
import type { UpdateProfilePayload, UserProfile } from '@/types';

export function useProfile() {
  return useQuery({
    queryKey: [API_CACHE_KEYS.PROFILE],
    queryFn: async () => {
      const res = await profileApi.get();
      return res.data.data as UserProfile;
    },
    staleTime: QUERY_STALE_TIMES.PROFILE,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateProfilePayload) => profileApi.update(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_CACHE_KEYS.PROFILE] });
      queryClient.invalidateQueries({ queryKey: [API_CACHE_KEYS.DASHBOARD] });
      Toast.show({ type: 'success', text1: 'Profile updated.' });
    },
    onError: (err: { message: string }) => {
      Toast.show({ type: 'error', text1: 'Update failed', text2: err.message });
    },
  });
}
