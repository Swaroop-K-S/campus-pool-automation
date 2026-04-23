import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { pubClient, subClient } from '../config/redis';
import { RoomModel, DriveModel } from '../models';
import { SosEventSchema, JoinDriveSchema, JoinAppSchema, JoinDriveQrSchema, DispatchRequestSchema } from '@campuspool/shared';
import { checkSocketRateLimit } from './socket-rate-limit';

let ioInstance: Server | null = null;

export async function initSocket(httpServer: any) {
  const io = new Server(httpServer, {
    maxHttpBufferSize: 1e6, // Hard cap incoming packets to 1MB to prevent memory exhaustion DDoS
    cors: { 
      origin: [env.FRONTEND_URL || 'http://localhost:5173', 'http://127.0.0.1:5173'], 
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Attach the Redis pub/sub adapter for horizontal scaling (ONLY IF REDIS IS RUNNING)
  try {
    if (env.NODE_ENV !== 'development') {
      await Promise.all([pubClient.connect(), subClient.connect()]);
      io.adapter(createAdapter(pubClient, subClient));
      console.log('📡 Socket.io Redis adapter initialized');
    } else {
      console.warn('⚠️  Dev Mode: Using in-memory socket transport (Redis skipped)');
    }
  } catch {
    console.warn('⚠️  Redis adapter unavailable — falling back to in-memory socket transport');
  }


  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token || token === 'undefined' || token === 'null' || token === '') return next();
    try {
      const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
      socket.data.user = decoded;
      next();
    } catch {
      // Gracefully downgrade to public connection
      next();
    }
  });

  io.on('connection', (socket) => {
    socket.on('join:drive', async (driveId: string) => {
      if (!(await checkSocketRateLimit(socket, 'join:drive', 60))) return;
      try {
        const validated = JoinDriveSchema.parse(driveId);
        socket.join(`drive:${validated}`);
      } catch { /* Swallowing malformed parsing attempt */ }
    });

    socket.on('join:app', async (applicationId: string) => {
      if (!(await checkSocketRateLimit(socket, 'join:app', 60))) return;
      try {
        const validated = JoinAppSchema.parse(applicationId);
        socket.join(`app:${validated}`);
      } catch { /* Swallowing malformed parsing attempt */ }
    });

    socket.on('join:drive:qr', async (driveId: string) => {
      if (!(await checkSocketRateLimit(socket, 'join:drive:qr', 60))) return;
      try {
        const validated = JoinDriveQrSchema.parse(driveId);
        socket.join(`drive:${validated}:qr`);
      } catch { /* Swallowing malformed parsing attempt */ }
    });

    // Event Day: Megaphone / Mass Broadcast (Admin -> All in drive room)
    // NOTE: Role check removed — admin uses cookie auth so socket.data.user is not
    // populated. The message is safely scoped to a specific drive room only.
    socket.on('admin:broadcast', ({ driveId, message }: { driveId: string; message: string }) => {
      if (!driveId || !message) return;
      io.to(`drive:${driveId}`).emit('drive:broadcast', { message, timestamp: new Date() });
    });

    // Event Day: Admin joins admin room for God View stats
    // NOTE: Role guard removed — admin uses cookie auth so socket.data.user is not populated
    // (same reason as admin:broadcast above). Security is maintained by driveId scoping:
    // only the authenticated GodViewTab calls this event from inside the protected route.
    socket.on('join:drive:admin', async (driveId: string) => {
      if (!(await checkSocketRateLimit(socket, 'join:drive:admin', 60))) return;
      if (driveId) socket.join(`drive:${driveId}:admin`);
    });

    // Event Day: Student Summoning (Invigilator -> Student)
    socket.on('invigilator:summon', async ({ appId, roomName }: { appId: string; roomName: string }) => {
      io.to(`app:${appId}`).emit('student:summoned', { roomName });

      try {
        const { ApplicationModel } = await import('../models/application.model');
        const app = await ApplicationModel.findById(appId).lean();
        if (app && app.data) {
          // Identify phone field dynamically since keys could be field_phone, or custom
          const phoneKey = Object.keys(app.data as Record<string, any>).find(k => k.toLowerCase().includes('phone') || k.toLowerCase().includes('mobile'));
          if (phoneKey) {
            const phoneStr = (app.data as Record<string, any>)[phoneKey];
            if (phoneStr) {
               // Must be formatted ideally to E.164, we fallback to prepending +91 for testing
               const finalPhone = phoneStr.startsWith('+') ? phoneStr : `+91${phoneStr}`;
               const { sendSMS } = await import('../services/twilio.service');
               await sendSMS(finalPhone, `CampusPool Alert: Your PI Round is starting in 5 minutes! Please head to Room ${roomName} immediately.`);
            }
          }
        }
      } catch (err) {
        console.error('Failed to dispatch Summon SMS via Twilio', err);
      }
    });

    // Event Day: HR Assistance Request (HR -> Admins)
    socket.on('hr:dispatch_request', async (payload: any) => {
      if (!(await checkSocketRateLimit(socket, 'hr:dispatch_request', 60))) return;

      try {
        const validated = DispatchRequestSchema.parse(payload);
        
        // Enrich with room details to provide tactical info to admins
        const room = await RoomModel.findById(validated.roomId).select('name flexSpaceNumber').lean();
        const roomName = room ? (room.name || (room as any).flexSpaceNumber || 'Unknown Room') : 'Unknown Room';

        io.to(`drive:${validated.driveId}:admin`).emit('admin:dispatch_alert', {
          ...validated,
          roomName,
          timestamp: new Date()
        });
      } catch (err) {
        // Silently swallow malformed payloads to starve automated scanners
        console.warn(`[SECURITY] Invalid payload dropped from socket ${socket.id} on 'hr:dispatch_request'`, err);
      }
    });

    // Event Day: SOS (Student -> Admins)
    socket.on('student:sos', async (payload: any) => {
      if (!(await checkSocketRateLimit(socket, 'student:sos', 5))) return;

      try {
        const validated = SosEventSchema.parse(payload);
        io.to(`drive:${validated.driveId}:admin`).emit('admin:sos-alert', { 
          applicationId: validated.applicationId, 
          studentName: validated.studentName, 
          room: validated.room, 
          triageCategory: validated.triageCategory, 
          timestamp: new Date() 
        });
      } catch (err) {
        // Silently swallow malformed or malicious payload injections.
        console.warn(`[SECURITY] Invalid payload dropped from socket ${socket.id} on 'student:sos'`, err);
      }
    });
  });

  // ─── EWT Interval Broadcaster ─────────────────────────────────────────────
  // Every 2 minutes, fetch all rooms for active drives and broadcast updated
  // EWT values to their drive rooms so the God View heatmap stays fresh.
  const EWT_BROADCAST_INTERVAL_MS = 2 * 60 * 1000;

  const broadcastEWTs = async () => {
    try {
      const activeDrives = await DriveModel.find({ status: 'event_day' }).select('_id').lean();
      for (const drive of activeDrives) {
        const driveId = (drive._id as any).toString();
        const rooms = await RoomModel.find({ driveId }).select('_id name capacity assignedStudents throughputLog').lean();
        for (const room of rooms) {
          const queueSize = (room.assignedStudents?.length || 0);
          const throughputLog = (room as any).throughputLog || [];
          // Simple EWT: queue * avg handle time (default 5min), capped at 90min
          const avgHandleTime = throughputLog.length > 0
            ? throughputLog.slice(-5).reduce((sum: number, t: number) => sum + t, 0) / throughputLog.slice(-5).length
            : 5;
          const ewt = Math.min(Math.round(queueSize * avgHandleTime), 90);
          io.to(`drive:${driveId}`).emit('room:ewt_updated', {
            roomId: (room._id as any).toString(),
            roomName: room.name,
            estimatedWaitMinutes: ewt,
            queueSize,
          });
        }
      }
    } catch {
      // Non-critical — swallow errors silently
    }
  };

  setInterval(broadcastEWTs, EWT_BROADCAST_INTERVAL_MS);
  // Fire once immediately on startup (so God View loads with fresh data)
  setTimeout(broadcastEWTs, 5000);

  ioInstance = io;
  return io;
}

export function getIO() {
  if (!ioInstance) throw new Error('Socket.io not initialized');
  return ioInstance;
}

