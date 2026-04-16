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
          alreadyCheckedIn: true,
          latecomer: (application as any).latecomer || false
        }
      });
      return;
    }

    // 4b. Check if already flagged as latecomer (held, awaiting admin override)
    if ((application as any).latecomer === true && !(application as any).adminOverrideTime) {
      const sessionToken = jwt.sign(
        { applicationId: application._id, driveId },
        env.JWT_ACCESS_SECRET,
        { expiresIn: '8h' }
      );
      res.json({
        success: false,
        code: 'LATECOMER_HOLD',
        data: {
          sessionToken,
          applicationId: application._id,
          studentName,
          latecomer: true,
          message: 'You arrived late. Please wait for admin approval to proceed.'
        }
      });
      return;
    }

    // 5. Latecomer SLA check — 30 minute window after reportTime
    const now = new Date();
    const driveReportTime = (drive as any).reportTime;
    const driveEventDate = (drive as any).eventDate;
    if (driveReportTime && driveEventDate) {
      // Construct a full datetime from eventDate + reportTime (e.g. "09:00")
      const eventDateStr = new Date(driveEventDate).toISOString().split('T')[0];
      const [reportHour, reportMin] = driveReportTime.split(':').map(Number);
      const reportDateTime = new Date(`${eventDateStr}T${String(reportHour).padStart(2,'0')}:${String(reportMin).padStart(2,'0')}:00`);
      const lateThreshold = new Date(reportDateTime.getTime() + 30 * 60 * 1000);

      if (now > lateThreshold) {
        // Flag as latecomer — hold for admin approval
        (application as any).latecomer = true;
        await application.save();

        // Emit latecomer alert to admin dashboard
        try {
          getIO().to(`drive:${driveId}`).emit('student:latecomer', {
            studentName,
            driveStudentId: application.driveStudentId,
            applicationId: application._id,
            minutesLate: Math.floor((now.getTime() - lateThreshold.getTime()) / 60000) + 30
          });
        } catch {}

        const sessionToken = jwt.sign(
          { applicationId: application._id, driveId },
          env.JWT_ACCESS_SECRET,
          { expiresIn: '8h' }
        );
        res.json({
          success: false,
          code: 'LATECOMER_HOLD',
          data: {
            sessionToken,
            applicationId: application._id,
            studentName,
            latecomer: true,
            message: 'You arrived after the 30-minute window. Please wait for admin approval to proceed.'
          }
        });
        return;
      }
    }

    // 6. Mark as attended
    application.status = 'attended' as any;
    application.attendedAt = new Date();

    // 6b. Auto-assign to least-full room for current round
    let assignedRoomInfo = null;
    if (application.currentRound && application.currentRound !== 'completed') {
      const rooms = await RoomModel.find({ driveId, round: application.currentRound, isLocked: false });
      if (rooms.length > 0) {
        let bestRoom = null;
        let maxAvailable = -1;
        for (const room of rooms) {
          const available = room.capacity - (room.assignedStudents?.length || 0);
          if (available > maxAvailable) {
            maxAvailable = available;
            bestRoom = room;
          }
        }
        
        if (bestRoom && maxAvailable > 0) {
          await RoomModel.findByIdAndUpdate(bestRoom._id, {
             $addToSet: { assignedStudents: application._id }
          });
          (application as any).assignedRoomId = bestRoom._id;
          assignedRoomInfo = bestRoom.name;
        }
      }
    }
    
    await application.save();

    // 7. Emit Socket.io
    const attendedCount = await ApplicationModel.countDocuments({
      driveId,
      status: { $in: ['attended', 'selected'] }
    });
    try {
      getIO().to(`drive:${driveId}`).emit('student:verified', { count: attendedCount, studentName });
      getIO().to(`drive:${driveId}`).emit('drive:round_batch_updated', { currentRound: application.currentRound });
      getIO().to(`app:${application._id}`).emit('student:status_changed', { 
        status: 'attended', 
        message: assignedRoomInfo ? `Assigned to ${assignedRoomInfo}` : undefined 
      });
      // God View live checked-in counter (admin dashboard)
      getIO().to(`drive:${driveId}:admin`).emit('drive:stats_updated', {
        driveId,
        checkedIn: attendedCount,
        studentName
      });
    } catch {}

    // 8. Generate session token (8h)
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
        alreadyCheckedIn: false,
        latecomer: false
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

    // Isolate the specific round the student is physically participating in.
    // They are immune to the drive's global 'active' status.
    const activeRound = application.currentRound && application.currentRound !== 'completed'
      ? drive.rounds?.find(r => r.type === application.currentRound) || null
      : null;

    // Find room assigned to this student exclusively for their current active round
    let assignedRoom = null;
    if (activeRound) {
      assignedRoom = await RoomModel.findOne({
        driveId,
        assignedStudents: application._id,
        round: activeRound.type
      });
    }

    // ── Estimated Wait Time (EWT) Engine ──────────────────────────────
    // Only relevant when student is attended and has an active round + room
    let queuePosition: number | null = null;
    let estimatedWaitMinutes: number | null = null;

    if (application.status === 'attended' && assignedRoom && activeRound) {
      // Count students in the same room who checked in BEFORE this student
      const studentsAheadInRoom = await ApplicationModel.countDocuments({
        driveId,
        status: 'attended',
        attendedAt: { $lt: application.attendedAt || new Date() },
        _id: { $in: (assignedRoom as any).assignedStudents || [] }
      });

      // Per-round processing time for IT interviews is typically 20-30 min
      // Use avg from any completed rounds in drives history, or default to 20 min
      const avgMinutesPerStudent = 20;
      queuePosition = studentsAheadInRoom + 1; // 1-based
      estimatedWaitMinutes = studentsAheadInRoom * avgMinutesPerStudent;
    }

    res.json({
      success: true,
      data: {
        status: application.status,                    // ← needed for rejected/standby detection
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
          eventDate: drive.eventDate,
          reportTime: (drive as any).reportTime || null  // ← needed for standby card
        },
        assignedRoom: assignedRoom ? { name: assignedRoom.name, floor: assignedRoom.floor } : null,
        activeRound: activeRound ? { type: activeRound.type, status: activeRound.status } : null,
        isSelected: application.status === 'selected',
        queuePosition,           // NEW: 1-based position in assigned room queue
        estimatedWaitMinutes,    // NEW: ~minutes until their turn
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
      .select('companyName jobRole eventDate venueDetails status resources');
    if (!drive) { res.status(404).json({ success: false, error: 'Drive not found' }); return; }
    res.json({ success: true, data: drive });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// GET /event/:driveId/push-subscribe (session token auth)
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

// GET /event/:driveId/status-lookup?usn=XXX  (PUBLIC — no auth)
// Lets students check their status + retrieve their Drive ID before event day
export const getStatusLookup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { driveId } = req.params;
    const usn = (req.query.usn as string)?.trim().toUpperCase();
    const ref = (req.query.ref as string)?.trim().toUpperCase();

    if (!usn && !ref) {
      res.status(400).json({ success: false, error: 'Provide a USN or reference number to look up your status.' });
      return;
    }

    const drive = await DriveModel.findById(driveId)
      .select('companyName jobRole eventDate venueDetails reportTime status rounds ctc resources');
    if (!drive) {
      res.status(404).json({ success: false, error: 'Drive not found.' });
      return;
    }

    // Build query — match by USN or ref number
    const query: any = { driveId };
    if (usn && ref) {
      query.$or = [
        { 'data.usn': new RegExp(`^${usn}$`, 'i') },
        { referenceNumber: new RegExp(`^${ref}$`, 'i') }
      ];
    } else if (usn) {
      query['data.usn'] = new RegExp(`^${usn}$`, 'i');
    } else {
      query.referenceNumber = new RegExp(`^${ref}$`, 'i');
    }

    const application = await ApplicationModel.findOne(query)
      .select('status driveStudentId referenceNumber currentRound attendedAt data.fullName data.branch');

    if (!application) {
      res.status(404).json({
        success: false,
        error: 'No application found for this drive. Please check your USN or contact the placement team.',
        code: 'NOT_FOUND'
      });
      return;
    }

    // Status label mapping
    const statusLabel: Record<string, string> = {
      applied: 'Applied',
      shortlisted: 'Shortlisted',
      invited: 'Invited',
      attended: 'Checked In',
      selected: 'Selected 🎉',
      rejected: 'Not Selected',
    };

    res.json({
      success: true,
      data: {
        studentName: (application as any).data?.fullName || 'Student',
        branch: (application as any)?.data?.branch || null,
        status: application.status,
        statusLabel: statusLabel[application.status as string] || application.status,
        driveStudentId: (application as any).driveStudentId || null,
        referenceNumber: (application as any).referenceNumber || null,
        currentRound: (application as any).currentRound || null,
        attendedAt: (application as any).attendedAt || null,
        drive: {
          companyName: drive.companyName,
          jobRole: drive.jobRole,
          ctc: drive.ctc,
          status: drive.status,
          eventDate: drive.eventDate,
          reportTime: (drive as any).reportTime || null,
          venueName: (drive as any).venueDetails?.hallName || null,
        }
      }
    });
  } catch (error: any) {
    console.error('getStatusLookup ERROR:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// POST /event/:driveId/latecomer-override (Admin only)
// Approves one or more latecomers — stamps adminOverrideTime and marks them attended
export const approveLatecomers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { driveId } = req.params;
    const { applicationIds } = req.body as { applicationIds: string[] };

    if (!applicationIds?.length) {
      res.status(400).json({ success: false, error: 'applicationIds array is required' });
      return;
    }

    const now = new Date();
    const result = await ApplicationModel.updateMany(
      { _id: { $in: applicationIds }, driveId, latecomer: true },
      {
        $set: {
          status: 'attended',
          attendedAt: now,
          adminOverrideTime: now
        }
      }
    );

    // Notify each student's live session
    try {
      for (const appId of applicationIds) {
        getIO().to(`app:${appId}`).emit('student:status_changed', {
          status: 'attended',
          message: 'Admin has approved your entry. Please proceed to your assigned room.'
        });
      }
      getIO().to(`drive:${driveId}`).emit('latecomer:approved', { applicationIds, approvedAt: now });
    } catch {}

    res.json({
      success: true,
      data: {
        modifiedCount: result.modifiedCount,
        message: `${result.modifiedCount} latecomer(s) approved and marked as attended.`
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// GET /event/:driveId/mia-students (Admin only)
// Returns students who checked in (attended) but are NOT assigned to any room — they may be 'missing'
export const getMIAStudents = async (req: Request, res: Response): Promise<void> => {
  try {
    const { driveId } = req.params;

    // Get all attended/latecomer students for this drive
    const attendedApps = await ApplicationModel.find({
      driveId,
      $or: [{ status: 'attended' }, { latecomer: true }]
    }).select('_id driveStudentId data currentRound attendedAt latecomer');

    if (!attendedApps.length) {
      res.json({ success: true, data: [] });
      return;
    }

    // Find which ones have a room assignment
    const appIds = attendedApps.map(a => a._id);
    const assignedRooms = await RoomModel.find({
      driveId,
      assignedStudents: { $in: appIds }
    }).select('assignedStudents');

    const assignedSet = new Set<string>();
    for (const room of assignedRooms) {
      for (const sid of (room as any).assignedStudents) {
        assignedSet.add(sid.toString());
      }
    }

    // MIA = attended but not in any room
    const miaStudents = attendedApps
      .filter(a => !assignedSet.has((a._id as any).toString()))
      .map(a => ({
        _id: a._id,
        driveStudentId: (a as any).driveStudentId,
        name: (a as any).data?.fullName || (a as any).data?.name || 'Unknown',
        branch: (a as any).data?.branch || '—',
        usn: (a as any).data?.usn || '—',
        currentRound: (a as any).currentRound || '—',
        attendedAt: (a as any).attendedAt || null,
        latecomer: (a as any).latecomer || false
      }));

    res.json({ success: true, data: miaStudents });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
