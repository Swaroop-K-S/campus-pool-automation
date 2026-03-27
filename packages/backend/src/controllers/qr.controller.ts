import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { DriveModel, ApplicationModel, RoomModel, PushSubscriptionModel, QRSessionModel } from '../models';
import { verifyQRToken, generateQRDataUrl } from '../services/qr.service';
import { startQRRotation, stopQRRotation } from '../socket/handlers/qr.handler';
import { getIO } from '../socket';
import { env } from '../config/env';

// GET /event/:driveId/qr/current (PUBLIC — no auth)
// Auto-starts QR rotation if no active session exists
export const getCurrentQR = async (req: Request, res: Response): Promise<void> => {
  try {
    const { driveId } = req.params;
    let session = await QRSessionModel.findOne({
      driveId,
      expiresAt: { $gt: new Date() }
    }).lean() as any;

    // Auto-start rotation if no active session
    if (!session) {
      try {
        await startQRRotation(driveId, getIO());
        // Fetch the newly created session
        session = await QRSessionModel.findOne({
          driveId,
          expiresAt: { $gt: new Date() }
        }).lean() as any;
      } catch (startErr: any) {
        console.error('Auto-start QR failed:', startErr.message);
      }
    }

    if (!session) {
      res.json({ success: false, error: 'QR could not be generated' });
      return;
    }

    const qrDataUrl = await generateQRDataUrl(session.token, driveId);
    res.json({
      success: true,
      data: {
        qrDataUrl,
        expiresAt: new Date(session.expiresAt).getTime()
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// POST /event/:driveId/qr/start
export const startQR = async (req: Request, res: Response): Promise<void> => {
  try {
    const { driveId } = req.params;
    const drive = await DriveModel.findById(driveId);
    if (!drive) { res.status(404).json({ success: false, error: 'Drive not found' }); return; }
    if (drive.status !== 'event_day') {
      res.status(400).json({ success: false, error: 'Drive must be in event_day status. Start event day first.' });
      return;
    }
    await startQRRotation(driveId, getIO());
    res.json({ success: true, data: { message: 'QR rotation started' } });
  } catch (error: any) {
    console.error('startQR ERROR:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// POST /event/:driveId/qr/stop
export const stopQR = async (req: Request, res: Response): Promise<void> => {
  try {
    stopQRRotation(req.params.driveId);
    res.json({ success: true, data: { message: 'QR rotation stopped' } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// POST /event/:driveId/verify (PUBLIC — no auth)
export const verifyStudent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { driveId } = req.params;
    const { token, driveStudentId } = req.body;

    if (!token || !driveStudentId) {
      res.status(400).json({ success: false, error: 'Token and Drive ID are required', code: 'MISSING_FIELDS' });
      return;
    }

    // 1. Verify JWT token
    try {
      verifyQRToken(token);
    } catch {
      res.status(401).json({
        success: false,
        error: 'QR code has expired. Please scan the latest QR code on screen.',
        code: 'QR_EXPIRED',
        expired: true
      });
      return;
    }

    // 2. Verify drive is in event_day status
    const drive = await DriveModel.findById(driveId);
    if (!drive) {
      res.status(404).json({ success: false, error: 'Drive not found', code: 'DRIVE_NOT_FOUND' });
      return;
    }
    if (drive.status === 'completed') {
      res.status(403).json({ success: false, error: 'This drive has ended. Your ID is no longer valid.', code: 'DRIVE_ENDED' });
      return;
    }
    if (drive.status !== 'event_day') {
      res.status(400).json({ success: false, error: 'This drive is not currently in event day mode.', code: 'DRIVE_NOT_ACTIVE' });
      return;
    }

    // 3. Find application by driveStudentId
    const application = await ApplicationModel.findOne({
      driveStudentId: driveStudentId.trim().toUpperCase(),
      driveId
    });

    if (!application) {
      res.status(404).json({ success: false, error: 'Invalid Drive ID. Please check your ID and try again.', code: 'INVALID_ID' });
      return;
    }

    const studentName = application.data?.fullName || application.data?.name || 'Student';

    // 4. Already checked in — return session anyway (idempotent)
    if (application.status === 'attended' || application.attendedAt) {
      const sessionToken = jwt.sign(
        { applicationId: application._id, driveId },
        env.JWT_ACCESS_SECRET,
        { expiresIn: '8h' }
      );
      res.json({
        success: true,
        data: {
          sessionToken,
          applicationId: application._id,
          studentName,
          alreadyCheckedIn: true
        }
      });
      return;
    }

    // 5. Mark as attended
    application.status = 'attended' as any;
    application.attendedAt = new Date();
    await application.save();

    // 6. Emit Socket.io
    const attendedCount = await ApplicationModel.countDocuments({
      driveId,
      status: { $in: ['attended', 'selected'] }
    });
    try {
      getIO().to(`drive:${driveId}`).emit('student:verified', { count: attendedCount, studentName });
    } catch {}

    // 7. Generate session token (8h)
    const sessionToken = jwt.sign(
      { applicationId: application._id, driveId },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      success: true,
      data: {
        sessionToken,
        applicationId: application._id,
        studentName,
        alreadyCheckedIn: false
      }
    });
  } catch (error: any) {
    console.error('verifyStudent ERROR:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// GET /event/:driveId/welcome/:appId (session token auth)
export const getWelcomeData = async (req: Request, res: Response): Promise<void> => {
  try {
    const { driveId, appId } = req.params;

    // Verify session token
    const authHeader = req.headers.authorization;
    if (!authHeader) { res.status(401).json({ success: false, error: 'No session token' }); return; }
    
    let decoded: any;
    try {
      decoded = jwt.verify(authHeader.replace('Bearer ', ''), env.JWT_ACCESS_SECRET);
    } catch {
      res.status(401).json({ success: false, error: 'Session expired' });
      return;
    }

    const application = await ApplicationModel.findOne({ _id: appId, driveId });
    if (!application) { res.status(404).json({ success: false, error: 'Application not found' }); return; }

    const drive = await DriveModel.findById(driveId);
    if (!drive) { res.status(404).json({ success: false, error: 'Drive not found' }); return; }

    // Find active round
    const activeRound = drive.rounds?.find(r => r.status === 'active') || null;

    // Find room assigned to this student
    let assignedRoom = null;
    if (activeRound) {
      assignedRoom = await RoomModel.findOne({
        driveId,
        assignedStudents: application._id,
        round: activeRound.type
      });
    }

    res.json({
      success: true,
      data: {
        student: {
          name: application.data?.fullName || application.data?.name,
          branch: application.data?.branch,
          usn: application.data?.usn,
          email: application.data?.email
        },
        drive: {
          companyName: drive.companyName,
          jobRole: drive.jobRole,
          schedule: drive.schedule,
          rounds: drive.rounds,
          venueDetails: drive.venueDetails,
          eventDate: drive.eventDate
        },
        assignedRoom: assignedRoom ? { name: assignedRoom.name, floor: assignedRoom.floor } : null,
        activeRound: activeRound ? { type: activeRound.type, status: activeRound.status } : null,
        isSelected: application.status === 'selected'
      }
    });
  } catch (error: any) {
    console.error('getWelcomeData ERROR:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// GET /event/:driveId/info (PUBLIC — no auth)
export const getDriveInfo = async (req: Request, res: Response): Promise<void> => {
  try {
    const drive = await DriveModel.findById(req.params.driveId)
      .select('companyName jobRole eventDate venueDetails status');
    if (!drive) { res.status(404).json({ success: false, error: 'Drive not found' }); return; }
    res.json({ success: true, data: drive });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// POST /event/:driveId/push-subscribe (session token auth)
export const pushSubscribe = async (req: Request, res: Response): Promise<void> => {
  try {
    const { driveId } = req.params;
    const { applicationId, subscription } = req.body;

    await PushSubscriptionModel.findOneAndUpdate(
      { applicationId },
      { applicationId, driveId, subscription },
      { upsert: true, new: true }
    );

    res.json({ success: true, data: { message: 'Subscribed' } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
