import { useDrawsStore } from '@/store/drawsStore';
import { useNotificationsStore } from './store/notificationsStore';

/** True when a draw arrived that the user hasn't seen: the bell and Draws tab red dots. */
export function useHasUnseenDraw(): boolean {
  const latest = useDrawsStore((s) => s.draws[0]);
  const seenDraw = useNotificationsStore((s) => s.seenDraw);
  const loaded = useNotificationsStore((s) => s.loaded);
  return loaded && seenDraw !== null && !!latest && latest.draw_number > seenDraw;
}
