import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/auth.store';

let socketInstance: Socket | null = null;

export function useSocket(): Socket {
  const token = useAuthStore.getState().accessToken;

  if (!socketInstance) {
    socketInstance = io(
      import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:5000',
      {
        auth: { token },
        autoConnect: true,
        reconnection: true,
        reconnectionDelay: 1000,
      }
    );
  }
  return socketInstance;
}
