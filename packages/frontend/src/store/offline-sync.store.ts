import { create } from 'zustand';
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { v4 as uuidv4 } from 'uuid';
import { useAuthStore } from './auth.store';
import { api } from '../services/api';
// We will export a getter for socket to avoid circular deps
import { getSocket } from '../hooks/use-socket';

export interface OfflineAction {
  id: string;
  type: 'HTTP' | 'SOCKET';
  status: 'PENDING' | 'FAILED';
  createdAt: number;
  method?: string;
  url?: string;
  headers?: any;
  data?: any;
  event?: string;
  payload?: any;
}

interface OfflineDb extends DBSchema {
  actions: {
    key: string;
    value: OfflineAction;
    indexes: { 'by-date': number };
  };
}

let dbPromise: Promise<IDBPDatabase<OfflineDb>>;

if (typeof window !== 'undefined') {
  dbPromise = openDB<OfflineDb>('campuspool-offline', 1, {
    upgrade(db) {
      const store = db.createObjectStore('actions', { keyPath: 'id' });
      store.createIndex('by-date', 'createdAt');
    },
  });
}

interface OfflineSyncState {
  isOnline: boolean;
  queuedActionsCount: number;
  isSyncing: boolean;
  setOnlineStatus: (status: boolean) => void;
  queueHttpAction: (config: any) => Promise<string>;
  queueSocketAction: (event: string, payload: any) => Promise<string>;
  syncActions: () => Promise<void>;
  initSyncListener: () => void;
  refreshQueueCount: () => Promise<void>;
}

export const useOfflineSyncStore = create<OfflineSyncState>((set, get) => ({
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  queuedActionsCount: 0,
  isSyncing: false,

  setOnlineStatus: (status) => set({ isOnline: status }),

  refreshQueueCount: async () => {
    try {
      const db = await dbPromise;
      const count = await db.count('actions');
      set({ queuedActionsCount: count });
    } catch {}
  },

  queueHttpAction: async (config) => {
    const db = await dbPromise;
    const id = uuidv4();
    
    // Avoid double queueing
    if (config._isReplay) return id;
    
    // Only queue non-GET requests
    if (config.method?.toLowerCase() === 'get') {
        return id;
    }
    
    await db.put('actions', {
      id,
      type: 'HTTP',
      status: 'PENDING',
      createdAt: Date.now(),
      method: config.method,
      url: config.url,
      headers: config.headers ? JSON.parse(JSON.stringify(config.headers)) : undefined, // Strip circular ref headers
      data: config.data,
    });
    get().refreshQueueCount();
    return id;
  },

  queueSocketAction: async (event, payload) => {
    const db = await dbPromise;
    const id = payload?.triageRequestId || payload?.id || uuidv4(); // Prefer existing keys or make one
    
    // inject idempotency key into payload
    const safePayload = typeof payload === 'object' && payload !== null ? { ...payload, idempotencyKey: id } : payload;
    
    await db.put('actions', {
      id,
      type: 'SOCKET',
      status: 'PENDING',
      createdAt: Date.now(),
      event,
      payload: safePayload,
    });
    get().refreshQueueCount();
    return id;
  },

  syncActions: async () => {
    if (get().isSyncing) return;
    set({ isSyncing: true });

    try {
      // Edge Case: Check and refresh JWT before processing
      const { user } = useAuthStore.getState();
      if (user) {
        try {
           // We fire a raw refresh API call to not trigger interceptors again
           await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'}/auth/refresh`, {
               method: 'POST',
               credentials: 'include'
           });
        } catch {
           console.warn('Silent refresh failed prior to sync. User may be logged out.');
        }
      }

      const db = await dbPromise;
      const tx = db.transaction('actions', 'readwrite');
      const store = tx.objectStore('actions');
      const allActions = await store.index('by-date').getAll();

      for (const action of allActions) {
        if (!navigator.onLine) break; // If net drops mid-sync, abort

        try {
          if (action.type === 'HTTP') {
            await api.request({
              method: action.method,
              url: action.url,
              headers: action.headers,
              data: action.data,
              _isReplay: true // Custom flag to prevent loops
            } as any);
          } else if (action.type === 'SOCKET') {
            const socket = getSocket();
            if (socket?.connected) {
              socket.emit(action.event!, action.payload);
            } else {
               throw new Error('Socket not connected');
            }
          }
          await db.delete('actions', action.id);
        } catch (e: any) {
           console.error('Failed to sync action', action.id, e);
           // If network error, stop sync and try later
           if (e?.code === 'ERR_NETWORK' || !navigator.onLine) break;
           
           // Otherwise drop it to avoid infinite block
           await db.delete('actions', action.id); 
        }
      }
      await get().refreshQueueCount();
    } finally {
      set({ isSyncing: false });
    }
  },

  initSyncListener: () => {
    get().refreshQueueCount();
    
    const handleOnline = () => {
      get().setOnlineStatus(true);
      get().syncActions();
    };
    const handleOffline = () => {
      get().setOnlineStatus(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Initial sync if already online
    if (navigator.onLine) {
       get().syncActions();
    }
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }
}));
