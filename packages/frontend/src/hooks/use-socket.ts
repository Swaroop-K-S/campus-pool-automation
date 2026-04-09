import { io, Socket } from 'socket.io-client';

let socketInstance: Socket | null = null;

export function useSocket(): Socket {
  if (!socketInstance) {
    socketInstance = io(
      import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:5000',
      {
        withCredentials: true,
        autoConnect: true,
        reconnection: true,
        reconnectionDelay: 1000,
      }
    );
  }
  return socketInstance;
}
