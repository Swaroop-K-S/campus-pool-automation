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
    if (!token || token === 'undefined' || token === 'null' || token === '') return next(); // allow public
    try {
      const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
      socket.data.user = decoded;
      next();
    } catch { 
      // If token is invalid/expired, gracefully downgrade to public connection instead of outright rejection
      next(); 
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
    // Join QR display room
    socket.on('join:drive:qr', (driveId: string) => {
      socket.join(`drive:${driveId}:qr`);
    });

    // Event Day: Megaphone / Mass Broadcast (Admin -> Students)
    socket.on('admin:broadcast', ({ driveId, message }: { driveId: string, message: string }) => {
      if (socket.data?.user?.role !== 'college_admin') return;
      io.to(`drive:${driveId}`).emit('drive:broadcast', { message });
    });

    // Event Day: Admin joins admin room
    socket.on('join:drive:admin', (driveId: string) => {
      if (socket.data?.user?.role === 'college_admin') {
        socket.join(`drive:${driveId}:admin`);
      }
    });

    // Event Day: Student Summoning (Invigilator -> Student)
    socket.on('invigilator:summon', ({ appId, roomName }: { appId: string, roomName: string }) => {
      io.to(`app:${appId}`).emit('student:summoned', { roomName });
    });

    // Event Day: SOS (Student -> Admins)
    socket.on('student:sos', ({ applicationId, driveId, studentName, room }: any) => {
      io.to(`drive:${driveId}:admin`).emit('admin:sos-alert', { applicationId, studentName, room, timestamp: new Date() });
    });
  });

  ioInstance = io;
  return io;
}

export function getIO() {
  if (!ioInstance) throw new Error("Socket.io not initialized");
  return ioInstance;
}
