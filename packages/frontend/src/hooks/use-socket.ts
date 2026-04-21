import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

let socketInstance: Socket | null = null;

export function getSocket(): Socket | null {
  return socketInstance;
}

export function useSocket(): Socket {
  if (!socketInstance) {
    socketInstance = io(
      import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:5000',
      {
        autoConnect: true,
        reconnection: true,
        reconnectionDelay: 1000,
      }
    );

    const originalEmit = socketInstance.emit;

    socketInstance.emit = function (event: string, ...args: any[]) {
      if (!navigator.onLine || !this.connected) {
        // Zero-Drop Offline Resilience
        if (!['connect', 'disconnect', 'error', 'ping', 'pong'].includes(event)) {
          import('../store/offline-sync.store').then(({ useOfflineSyncStore }) => {
            const payload = args.length > 0 ? args[0] : {};
            useOfflineSyncStore.getState().queueSocketAction(event, payload);
            import('react-hot-toast').then(({ default: toast }) => {
               toast.success('Offline. Action saved locally.', { id: 'offline-toast-socket' });
            });
          }).catch(console.error);
        }
        return this; // Return socket instance for chaining
      }
      return originalEmit.apply(this, [event, ...args] as any);
    };
  }
  return socketInstance;
}

export function useSocketConnection() {
  const [isConnected, setIsConnected] = useState(false);
  const socket = useSocket();

  useEffect(() => {
    if (!socket) return;

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    setIsConnected(socket.connected);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, [socket]);

  return isConnected;
}
