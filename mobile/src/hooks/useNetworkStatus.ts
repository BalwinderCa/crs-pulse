import { useEffect, useRef, useState } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import Toast from 'react-native-toast-message';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  // Skip the first event — NetInfo fires immediately with current state;
  // we don't want to flash "Back Online" on every app launch.
  const initialFired = useRef(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const online = state.isConnected === true && state.isInternetReachable !== false;
      setIsOnline(online);

      if (!initialFired.current) {
        initialFired.current = true;
        return; // suppress first event
      }

      if (!online) {
        Toast.show({
          type: 'error',
          text1: 'No Internet Connection',
          text2: 'Showing cached data.',
          visibilityTime: 3000,
        });
      } else {
        Toast.show({
          type: 'success',
          text1: 'Back Online',
          visibilityTime: 2000,
        });
      }
    });

    return () => unsubscribe();
  }, []);

  return { isOnline };
}
