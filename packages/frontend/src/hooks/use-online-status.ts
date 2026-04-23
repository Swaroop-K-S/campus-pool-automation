import { useState, useEffect } from 'react';

/**
 * useOnlineStatus
 *
 * A lightweight hook that tracks the browser's network connectivity state
 * by subscribing to the standard `online` / `offline` Window events.
 *
 * Returns `true` when the browser reports a live network connection,
 * `false` when it is offline. Initialises from `navigator.onLine` so
 * the very first render is already accurate (no flicker).
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const goOnline  = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);

    window.addEventListener('online',  goOnline);
    window.addEventListener('offline', goOffline);

    return () => {
      window.removeEventListener('online',  goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return isOnline;
}
