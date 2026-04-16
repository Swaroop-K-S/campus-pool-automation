import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

let socketInstance: Socket | null = null;

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
