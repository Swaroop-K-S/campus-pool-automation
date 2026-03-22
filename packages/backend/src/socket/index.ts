import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

let ioInstance: Server | null = null;

export function initSocket(httpServer: any) {
  const io = new Server(httpServer, {
    cors: { origin: env.FRONTEND_URL || '*', methods: ['GET', 'POST'] }
  });

  io.use((socket, next) => {
    // JWT auth middleware for socket
    // Public pages skip auth
    const token = socket.handshake.auth.token;
    if (!token) return next(); // allow public
    try {
      const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
      socket.data.user = decoded;
      next();
    } catch { 
      next(new Error('Unauthorized')); 
    }
  });

  io.on('connection', (socket) => {
    // Join drive room
    socket.on('join:drive', (driveId: string) => {
      socket.join(`drive:${driveId}`);
    });
    // Join personal room (for student selected notification)
    socket.on('join:app', (applicationId: string) => {
      socket.join(`app:${applicationId}`);
    });
  });

  ioInstance = io;
  return io;
}

export function getIO() {
  if (!ioInstance) throw new Error("Socket.io not initialized");
  return ioInstance;
}
