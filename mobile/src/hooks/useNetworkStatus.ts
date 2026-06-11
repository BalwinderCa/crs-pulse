import { useEffect, useRef, useState } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import Toast from 'react-native-toast-message';

/** null while NetInfo is still probing internet reachability. */
function resolveOnline(state: NetInfoState): boolean | null {
  if (state.isConnected !== true) return false;
  if (state.isInternetReachable === null) return null;
  return state.isInternetReachable !== false;
}

/** Ignore NetInfo flicker while the app is starting (Android often reports offline briefly). */
const STARTUP_GRACE_MS = 3_000;

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const prevOnline = useRef<boolean | null>(null);
  const listening = useRef(false);
  const offlineNotified = useRef(false);

  useEffect(() => {
    const notifyOffline = () => {
      offlineNotified.current = true;
      Toast.show({
        type: 'error',
        text1: 'No Internet Connection',
        text2: 'Showing cached data.',
        visibilityTime: 3000,
      });
    };

    const notifyOnline = () => {
      if (!offlineNotified.current) return;
      offlineNotified.current = false;
      Toast.show({
        type: 'success',
        text1: 'Back Online',
        visibilityTime: 2000,
      });
    };

    const applyState = (state: NetInfoState) => {
      const online = resolveOnline(state);
      if (online === null) return;

      setIsOnline(online);

      if (!listening.current) {
        prevOnline.current = online;
        return;
      }

      const prev = prevOnline.current;
      prevOnline.current = online;

      if (prev === null || prev === online) return;

      if (!online) notifyOffline();
      else notifyOnline();
    };

    const unsubscribe = NetInfo.addEventListener(applyState);

    const graceTimer = setTimeout(async () => {
      listening.current = true;
      try {
        const state = await NetInfo.fetch();
        const online = resolveOnline(state);
        if (online === null) return;

        setIsOnline(online);
        prevOnline.current = online;

        if (!online) notifyOffline();
      } catch {
        // Listener will keep updating state.
      }
    }, STARTUP_GRACE_MS);

    return () => {
      clearTimeout(graceTimer);
      unsubscribe();
    };
  }, []);

  return { isOnline };
}
