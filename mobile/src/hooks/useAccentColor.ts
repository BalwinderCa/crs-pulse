import { useProfileStore } from '@/store/profileStore';
import { useIsPro } from '@/store/proStore';

const DEFAULT_ACCENT = '#DC2626';

/** The chosen accent for Pro (and during the trial); the default red otherwise. The choice stays saved. */
export function useAccentColor(): string {
  const chosen = useProfileStore(s => s.profile?.accent_color ?? DEFAULT_ACCENT);
  return useIsPro() ? chosen : DEFAULT_ACCENT;
}
