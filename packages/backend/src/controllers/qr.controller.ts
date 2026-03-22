import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { DriveModel, ApplicationModel, RoomModel, PushSubscriptionModel } from '../models';
import { verifyQRToken } from '../services/qr.service';
import { startQRRotation, stopQRRotation } from '../socket/handlers/qr.handler';
import { getIO } from '../socket';
import { env } from '../config/env';

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
    const { token, name, email, phone } = req.body;

    if (!token || !email) {
      res.status(400).json({ success: false, error: 'Token and email are required' });
      return;
    }

    // 1. Verify JWT token
    let decoded: any;
    try {
      decoded = verifyQRToken(token);
    } catch {
      res.status(401).json({
        success: false,
        error: 'QR code has expired. Please scan the latest QR code.',
        expired: true
      });
      return;
    }

    if (decoded.driveId !== driveId) {
      res.status(400).json({ success: false, error: 'Invalid QR code for this drive' });
      return;
    }

    // 2. Find application
    const application = await ApplicationModel.findOne({
      driveId,
      'data.email': email.toLowerCase().trim(),
      status: { $in: ['shortlisted', 'invited', 'applied'] }
    });

    if (!application) {
      // Check if already attended
      const attended = await ApplicationModel.findOne({
        driveId,
        'data.email': email.toLowerCase().trim(),
        status: 'attended'
      });

      if (attended) {
        res.status(409).json({
          success: false,
          error: 'You have already checked in!',
          alreadyCheckedIn: true,
          applicationId: attended._id
        });
        return;
      }

      res.status(404).json({
        success: false,
        error: 'You are not registered for this drive'
      });
      return;
    }

    // 3. Update application
    application.status = 'attended' as any;
    application.attendedAt = new Date();
    await application.save();

    // 4. Emit to drive room
    const attendedCount = await ApplicationModel.countDocuments({ driveId, status: 'attended' });
    try {
      getIO().to(`drive:${driveId}`).emit('student:verified', { count: attendedCount });
    } catch {}

    // 5. Generate session token (8h)
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
        studentName: application.data?.fullName || application.data?.name || name
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
