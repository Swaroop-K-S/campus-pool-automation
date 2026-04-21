import React, { useEffect } from 'react';
import { useOfflineSyncStore } from '../store/offline-sync.store';

export const GlobalOfflineBanner: React.FC = () => {
  const { isOnline, queuedActionsCount, initSyncListener } = useOfflineSyncStore();

  useEffect(() => {
    const cleanup = initSyncListener();
    return cleanup;
  }, [initSyncListener]);

  if (isOnline && queuedActionsCount === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100000] bg-orange-500 text-white px-4 py-2 text-sm font-medium flex items-center justify-between shadow-lg slide-in-from-top animate-in duration-300">
      <div className="flex items-center gap-2">
        {!isOnline ? (
          <>
            <span className="w-2 h-2 rounded-full bg-red-800 animate-pulse" />
            <span>Working Offline - Changes are saved locally and will sync automatically.</span>
          </>
        ) : (
          <>
            <span className="w-4 h-4 text-white animate-spin">♻️</span>
            <span>Connection Restored - Syncing your changes...</span>
          </>
        )}
      </div>
      {queuedActionsCount > 0 && (
        <div className="bg-orange-600 px-2 py-1 rounded text-xs font-bold shadow-inner">
          {queuedActionsCount} PENDING ACTION{queuedActionsCount !== 1 ? 'S' : ''}
        </div>
      )}
    </div>
  );
};
