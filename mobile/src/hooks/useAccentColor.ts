import { useProfileStore } from '@/store/profileStore';

export function useAccentColor(): string {
  return useProfileStore(s => s.profile?.accent_color ?? '#DC2626');
}
