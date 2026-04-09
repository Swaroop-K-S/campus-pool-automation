import { Request, Response } from 'express';
import { DriveModel, RoomModel } from '../models';
import { getIO } from '../socket';

export const updateEventSetup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { driveId } = req.params;
    const { hallName, capacity, eventDate, reportTime, schedule } = req.body;
    
    const drive = await DriveModel.findByIdAndUpdate(driveId, {
      $set: {
        eventDate,
        venueDetails: { hallName, capacity },
        reportTime,
        schedule
      }
    }, { new: true });

    if (!drive) {
      res.status(404).json({ success: false, error: 'Drive not found' });
      return;
    }

    try { getIO().to(`drive:${driveId}`).emit('event:setup_updated', drive); } catch {}
    res.json({ success: true, data: drive });
  } catch (error: any) {
    console.error("updateEventSetup ERROR:", error);
    res.status(500).json({ success: false, error: error.message || 'Failed to update event setup' });
  }
};

export const getEventSetup = async (req: Request, res: Response): Promise<void> => {
  try {
    const drive = await DriveModel.findById(req.params.driveId).select('eventDate venueDetails reportTime schedule rounds status resources');
    res.json({ success: true, data: drive });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: 'Failed to get event setup' });
  }
};

export const createRoom = async (req: Request, res: Response): Promise<void> => {
  try {
    const { driveId } = req.params;
    const collegeId = (req as any).user.collegeId;
    const room = await RoomModel.create({ ...req.body, driveId, collegeId });
    res.json({ success: true, data: room });
  } catch (error: any) {
    console.error("createRoom ERROR:", error);
    res.status(500).json({ success: false, error: error.message || 'Failed to create room' });
  }
};

export const getRooms = async (req: Request, res: Response): Promise<void> => {
  try {
    const rooms = await RoomModel.find({ driveId: req.params.driveId });
    res.json({ success: true, data: rooms });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to get rooms' });
  }
};

export const getRoomWithStudents = async (req: Request, res: Response): Promise<void> => {
  try {
    const room = await RoomModel.findOne({ _id: req.params.roomId, driveId: req.params.driveId })
      .populate('assignedStudents', 'data referenceNumber status');
    
    if (!room) {
      res.status(404).json({ success: false, error: 'Room not found' });
      return;
    }
    res.json({ success: true, data: room });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to get room details' });
  }
};

export const updateRoom = async (req: Request, res: Response): Promise<void> => {
  try {
    const room = await RoomModel.findOneAndUpdate({ _id: req.params.roomId, driveId: req.params.driveId }, req.body, { new: true });
    res.json({ success: true, data: room });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: 'Failed to update room' });
  }
};

export const deleteRoom = async (req: Request, res: Response): Promise<void> => {
  try {
    await RoomModel.findOneAndDelete({ _id: req.params.roomId, driveId: req.params.driveId });
    res.json({ success: true, data: { message: 'Room deleted' } });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: 'Failed to delete room' });
  }
};

export const activateRound = async (req: Request, res: Response): Promise<void> => {
  try {
    const { driveId, roundType } = req.params;
    const drive = await DriveModel.findById(driveId);
    if (!drive) {
      res.status(404).json({ success: false, error: 'Drive not found' });
      return;
    }

    if (drive.rounds) {
      drive.rounds.forEach(r => {
        if (r.type === roundType) r.status = 'active';
      });
      await drive.save();
    }

    try {
      getIO().to(`drive:${driveId}`).emit('round:status_changed', {
        roundType, status: 'active', timestamp: new Date()
      });
    } catch {}

    res.json({ success: true, data: drive.rounds });
  } catch (error: any) {
    console.error("activateRound ERROR:", error);
    res.status(500).json({ success: false, error: error.message || 'Failed to activate round' });
  }
};

export const completeRound = async (req: Request, res: Response): Promise<void> => {
  try {
    const { driveId, roundType } = req.params;
    const drive = await DriveModel.findById(driveId);
    if (!drive) {
      res.status(404).json({ success: false, error: 'Drive not found' });
      return;
    }

    if (drive.rounds) {
      drive.rounds.forEach(r => {
        if (r.type === roundType) r.status = 'completed';
      });
      await drive.save();
    }

    try {
      getIO().to(`drive:${driveId}`).emit('round:status_changed', {
        roundType, status: 'completed', timestamp: new Date()
      });
    } catch {}

    res.json({ success: true, data: drive.rounds });
  } catch (error: any) {
    console.error("completeRound ERROR:", error);
    res.status(500).json({ success: false, error: error.message || 'Failed to complete round' });
  }
};

export const startEventDay = async (req: Request, res: Response): Promise<void> => {
  try {
    const { driveId } = req.params;

    // 1. Get drive to determine the first round
    const driveObj = await DriveModel.findById(driveId);
    if (!driveObj) {
      res.status(404).json({ success: false, error: 'Drive not found' });
      return;
    }

    const firstRound = driveObj.rounds && driveObj.rounds.length > 0 ? driveObj.rounds[0].type : null;

    // 2. Bootstrap: Ensure all applications without a current round are added to the first round
    if (firstRound) {
      await ApplicationModel.updateMany(
        { driveId, $or: [{ currentRound: { $exists: false } }, { currentRound: null }] },
        { $set: { currentRound: firstRound } }
      );
    }

    // 3. Update the drive status
    const drive = await DriveModel.findByIdAndUpdate(driveId, {
      $set: { status: 'event_day' }
    }, { new: true });

    if (!drive) {
      res.status(404).json({ success: false, error: 'Drive not found' });
      return;
    }

    try {
      getIO().to(`drive:${driveId}`).emit('event:started', {
        driveId, timestamp: new Date()
      });
    } catch {}

    res.json({ success: true, data: drive });
  } catch (error: any) {
    console.error("startEventDay ERROR:", error);
    res.status(500).json({ success: false, error: error.message || 'Failed to start event day' });
  }
};
import * as xlsx from 'xlsx';
import { ApplicationModel } from '../models';

export const advanceRound = async (req: Request, res: Response): Promise<void> => {
  try {
    const { driveId, roundType } = req.params;
    const drive = await DriveModel.findById(driveId);
    if (!drive) {
      res.status(404).json({ success: false, error: 'Drive not found' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ success: false, error: 'Excel file is required' });
      return;
    }

    // 1. Parse Excel
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json<any>(sheet);

    // Collect all identifiers (emails or reference numbers)
    const passedIdentifiers = new Set<string>();
    rows.forEach(row => {
      const vals = Object.values(row);
      vals.forEach((v: any) => {
        if (typeof v === 'string') {
          passedIdentifiers.add(v.trim().toLowerCase());
        }
      });
    });

    const identifiersArray = Array.from(passedIdentifiers);

    if (identifiersArray.length === 0) {
      res.status(400).json({ success: false, error: 'No valid identifiers found in Excel' });
      return;
    }

    // 2. Find Rounds info
    const currentRoundIndex = drive.rounds ? drive.rounds.findIndex(r => r.type === roundType) : -1;
    if (currentRoundIndex === -1) {
      res.status(404).json({ success: false, error: 'Round not found in drive' });
      return;
    }

    const nextRound = drive.rounds ? drive.rounds[currentRoundIndex + 1] : null;

    // 3. Update passed candidates
    const passedQuery = { 
      driveId, 
      currentRound: roundType,
      $or: [
        { referenceNumber: { $in: identifiersArray.map(i => new RegExp(`^${i}$`, 'i')) } },
        { 'data.email': { $in: identifiersArray.map(i => new RegExp(`^${i}$`, 'i')) } },
        { 'data.usn': { $in: identifiersArray.map(i => new RegExp(`^${i}$`, 'i')) } }
      ]
    };

    const updatePassed = nextRound 
      ? { currentRound: nextRound.type, status: 'shortlisted' }
      : { currentRound: 'completed', status: 'selected' };

    await ApplicationModel.updateMany(passedQuery, { $set: updatePassed });

    // 4. Update failed candidates
    // Anyone who was active but NOT in the passed list IN THIS ROUND specifically
    const failedQuery = {
      driveId,
      currentRound: roundType,
      status: { $nin: ['rejected', 'selected'] }, // they are still active
      $nor: [
        { referenceNumber: { $in: identifiersArray.map(i => new RegExp(`^${i}$`, 'i')) } },
        { 'data.email': { $in: identifiersArray.map(i => new RegExp(`^${i}$`, 'i')) } },
        { 'data.usn': { $in: identifiersArray.map(i => new RegExp(`^${i}$`, 'i')) } }
      ]
    };

    await ApplicationModel.updateMany(failedQuery, { $set: { status: 'rejected' } });

    // 5. Autocomplete the drive round
    if (drive.rounds) {
      drive.rounds[currentRoundIndex].status = 'completed';
      if (nextRound) {
        drive.rounds[currentRoundIndex + 1].status = 'pending';
      }
      await drive.save();
    }
    
    // 6. Emit Socket.io
    try {
      getIO().to(`drive:${driveId}`).emit('round:status_changed', {
        roundType,
        status: 'completed',
        nextRound: nextRound ? nextRound.type : null,
        timestamp: new Date()
      });
      getIO().to(`drive:${driveId}`).emit('drive:round_batch_updated', { roundType: nextRound ? nextRound.type : 'completed' });
      getIO().to(`drive:${driveId}`).emit('student:status_changed');
    } catch {}

    res.json({ 
      success: true, 
      data: { 
        message: `Advanced candidates to ${nextRound ? nextRound.type : 'selected'}`,
        nextRound: nextRound ? nextRound.type : null
      }
    });

  } catch (error: any) {
    console.error("advanceRound ERROR:", error);
    res.status(500).json({ success: false, error: error.message || 'Failed to advance round' });
  }
};

// POST /drives/:driveId/rounds/:roundType/advance-present
// Single-click advancement: all students who physically scanned in (status='attended')
// are moved to the next round. Absent students (still 'applied'/'shortlisted') are rejected.
export const advancePresentStudents = async (req: Request, res: Response): Promise<void> => {
  try {
    const { driveId, roundType } = req.params;
    const drive = await DriveModel.findById(driveId);
    if (!drive) {
      res.status(404).json({ success: false, error: 'Drive not found' });
      return;
    }

    const currentRoundIndex = drive.rounds ? drive.rounds.findIndex(r => r.type === roundType) : -1;
    if (currentRoundIndex === -1) {
      res.status(404).json({ success: false, error: 'Round not found in drive' });
      return;
    }

    const nextRound = drive.rounds ? drive.rounds[currentRoundIndex + 1] : null;

    // Count how many students are currently `attended` in this round — these are the ones who scanned the QR
    const presentCount = await ApplicationModel.countDocuments({ driveId, currentRound: roundType, status: 'attended' });

    if (presentCount === 0) {
      res.status(400).json({ success: false, error: 'No checked-in students found for this round. Make sure students have scanned the QR code first.' });
      return;
    }

    // 1. Advance all attended students IN THIS ROUND to the next round (or select them if this is the last round)
    const advanceUpdate = nextRound
      ? { status: 'shortlisted', currentRound: nextRound.type }
      : { status: 'selected', currentRound: 'completed' };

    const advanceResult = await ApplicationModel.updateMany(
      { driveId, currentRound: roundType, status: 'attended' },
      { $set: advanceUpdate }
    );

    // 2. Reject all who are still in 'applied' or 'shortlisted' state IN THIS ROUND (never scanned in — no-shows)
    const rejectResult = await ApplicationModel.updateMany(
      { driveId, currentRound: roundType, status: { $in: ['applied', 'shortlisted'] } },
      { $set: { status: 'rejected' } }
    );

    // 3. Mark the current round as completed, activate next round if any
    if (drive.rounds) {
      drive.rounds[currentRoundIndex].status = 'completed';
      if (nextRound) {
        drive.rounds[currentRoundIndex + 1].status = 'active';
      }
      await drive.save();
    }

    // 4. Emit real-time socket update
    try {
      getIO().to(`drive:${driveId}`).emit('round:status_changed', {
        roundType,
        status: 'completed',
        nextRound: nextRound ? nextRound.type : null,
        timestamp: new Date()
      });
      getIO().to(`drive:${driveId}`).emit('drive:round_batch_updated', { roundType: nextRound ? nextRound.type : 'completed' });
      getIO().to(`drive:${driveId}`).emit('student:status_changed');
    } catch {}

    res.json({
      success: true,
      data: {
        advanced: advanceResult.modifiedCount,
        rejected: rejectResult.modifiedCount,
        nextRound: nextRound ? nextRound.type : null,
        message: `${advanceResult.modifiedCount} students advanced to ${nextRound ? nextRound.type : 'final selection'}. ${rejectResult.modifiedCount} no-shows rejected.`
      }
    });

  } catch (error: any) {
    console.error("advancePresentStudents ERROR:", error);
    res.status(500).json({ success: false, error: error.message || 'Failed to advance students' });
  }
};

export const updateRoomCapacity = async (req: Request, res: Response): Promise<void> => {
  try {
    const { roomId } = req.params;
    const { capacityDelta } = req.body;

    if (!capacityDelta || typeof capacityDelta !== 'number') {
      res.status(400).json({ success: false, error: 'Valid capacityDelta number required' });
      return;
    }

    const room = await RoomModel.findById(roomId);
    if (!room) {
      res.status(404).json({ success: false, error: 'Room not found' });
      return;
    }

    room.capacity = Math.max(1, room.capacity + capacityDelta);
    await room.save();
    
    // Broadcast immediately so God View updates organically
    try {
      getIO().to(`drive:${room.driveId}`).emit('room:updated', { roomId: room._id, capacity: room.capacity });
    } catch {}

    res.json({ success: true, data: room });
  } catch (error: any) {
    console.error("updateRoomCapacity ERROR:", error);
    res.status(500).json({ success: false, error: error.message || 'Failed to update capacity' });
  }
};

export const purgeNoShows = async (req: Request, res: Response): Promise<void> => {
  try {
    const { driveId } = req.params;
    
    // Find students whose status is 'attended' (gate entry done) 
    // And whose record hasn't been updated for > 45 minutes
    const staleThreshold = new Date(Date.now() - 45 * 60 * 1000);

    const staleStudents = await ApplicationModel.find({
      driveId,
      status: 'attended', // Or shortlisted but scanned in
      updatedAt: { $lt: staleThreshold }
    });

    if (staleStudents.length === 0) {
      res.json({ success: true, data: { purged: 0, message: 'Queue is clean. No stagnant students found.' } });
      return;
    }

    const staleIds = staleStudents.map(s => s._id);

    // 1. Move them to "rejected" so they drop out of all active live queues
    await ApplicationModel.updateMany({ _id: { $in: staleIds } }, { $set: { status: 'rejected' } });

    // 2. We must remove them from any RoomModel `assignedStudents` arrays where they might be blocking slots
    await RoomModel.updateMany(
      { driveId },
      { $pullAll: { assignedStudents: staleIds } }
    );

    try {
      getIO().to(`drive:${driveId}`).emit('student:status_changed');
      getIO().to(`drive:${driveId}`).emit('room:assignments_updated'); // custom event to trigger refetch
    } catch {}

    res.json({ 
      success: true, 
      data: { 
        purged: staleIds.length, 
        message: `Successfully purged ${staleIds.length} stale students from live queues.` 
      } 
    });
  } catch (error: any) {
    console.error("purgeNoShows ERROR:", error);
    res.status(500).json({ success: false, error: error.message || 'Failed to purge stale students' });
  }
};

// ─────────────────────────────────────────────────────────────────
// POST /drives/:driveId/walk-in   (Admin only, drive must be event_day)
// Instantly registers a walk-in student, creates their Application,
// marks them as attended, and assigns a Drive Student ID.
// ─────────────────────────────────────────────────────────────────
export const walkInRegistration = async (req: Request, res: Response): Promise<void> => {
  try {
    const { driveId } = req.params;
    const collegeId = (req as any).user.collegeId;
    const { name, usn, branch, phone, email } = req.body as {
      name: string; usn: string; branch: string; phone?: string; email?: string;
    };

    if (!name || !usn) {
      res.status(400).json({ success: false, error: 'Name and USN are required for walk-in registration.' });
      return;
    }

    const drive = await DriveModel.findOne({ _id: driveId, collegeId });
    if (!drive) {
      res.status(404).json({ success: false, error: 'Drive not found.' });
      return;
    }
    if ((drive as any).status !== 'event_day') {
      res.status(400).json({ success: false, error: 'Walk-in registration is only available during event day.' });
      return;
    }

    // Generate a sequential Drive Student ID
    const { ApplicationModel } = await import('../models');
    const count = await ApplicationModel.countDocuments({ driveId });
    const driveStudentId = `WI-${String(count + 1).padStart(3, '0')}`;
    const refNum = `CP-WI-${Date.now().toString().slice(-6)}`;

    const firstRound = ((drive as any).rounds?.[0]?.type) || 'ppt';

    const application = await ApplicationModel.create({
      driveId,
      collegeId,
      referenceNumber: refNum,
      driveStudentId,
      status: 'attended',
      currentRound: firstRound,
      attendedAt: new Date(),
      submittedAt: new Date(),
      data: {
        fullName: name.trim(),
        usn: usn.trim().toUpperCase(),
        branch: branch?.trim() || '',
        phone: phone?.trim() || '',
        email: email?.trim().toLowerCase() || `${usn.toLowerCase()}@walkin.local`,
        walkIn: true,
      }
    });

    // Broadcast to God View
    try {
      getIO().to(`drive:${driveId}`).emit('event:walk_in_registered', {
        driveStudentId, name, usn, branch
      });
    } catch {}

    res.status(201).json({
      success: true,
      data: {
        application,
        driveStudentId,
        message: `Walk-in registered successfully. Drive ID: ${driveStudentId}`
      }
    });
  } catch (error: any) {
    console.error('walkInRegistration ERROR:', error);
    res.status(500).json({ success: false, error: error.message || 'Walk-in registration failed' });
  }
};

// ─────────────────────────────────────────────────────────────────
// GET /drives/:driveId/projector-stats  (PUBLIC — no JWT required)
// Powers the wall display screen. Returns aggregate stats + recent
// check-ins for the active round. Designed for polling every 8s.
// ─────────────────────────────────────────────────────────────────
export const getProjectorStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { driveId } = req.params;
    const { ApplicationModel: AppModel } = await import('../models');

    const drive = await DriveModel.findById(driveId)
      .select('companyName jobRole status rounds eventDate venueDetails')
      .lean();

    if (!drive) {
      res.status(404).json({ success: false, error: 'Drive not found' });
      return;
    }

    const allApps = await AppModel.find({ driveId })
      .select('status currentRound driveStudentId attendedAt data.fullName data.name data.usn data.branch')
      .sort({ attendedAt: -1 })
      .lean();

    // Per-round breakdown
    const roundStats = (drive.rounds || []).map((r: any) => ({
      type: r.type,
      label: r.label || r.type,
      status: r.status,
      count: allApps.filter(a => a.currentRound === r.type).length,
    }));

    // Overall summary
    const total     = allApps.length;
    const checkedIn = allApps.filter(a => ['attended','shortlisted','invited','selected','rejected'].includes(a.status)).length;
    const selected  = allApps.filter(a => a.status === 'selected').length;
    const rejected  = allApps.filter(a => a.status === 'rejected').length;
    const active    = allApps.filter(a => ['attended','shortlisted'].includes(a.status)).length;

    // Most recent 12 check-ins
    const recentEntries = allApps
      .filter(a => (a as any).attendedAt)
      .slice(0, 12)
      .map(a => ({
        driveStudentId: a.driveStudentId || '—',
        name: (a as any).data?.fullName || (a as any).data?.name || 'Student',
        usn: (a as any).data?.usn || '—',
        branch: (a as any).data?.branch || '',
        status: a.status,
        currentRound: a.currentRound || '—',
        attendedAt: (a as any).attendedAt,
      }));

    // Active round label
    const activeRound = (drive.rounds || []).find((r: any) => r.status === 'active');

    res.json({
      success: true,
      data: {
        drive: {
          companyName: (drive as any).companyName,
          jobRole: (drive as any).jobRole,
          status: (drive as any).status,
          eventDate: (drive as any).eventDate,
          venue: (drive as any).venueDetails?.hallName,
        },
        summary: { total, checkedIn, active, selected, rejected },
        activeRound: activeRound ? { type: activeRound.type, label: (activeRound as any).label || activeRound.type } : null,
        roundStats,
        recentEntries,
        generatedAt: new Date(),
      }
    });
  } catch (error: any) {
    console.error('getProjectorStats ERROR:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// PATCH /drives/:driveId/rooms/:roomId/lock
export const lockRoom = async (req: Request, res: Response): Promise<void> => {
  try {
    const { driveId, roomId } = req.params;
    const { isLocked } = req.body;

    const room = await RoomModel.findOneAndUpdate(
      { _id: roomId, driveId },
      { $set: { isLocked } },
      { new: true }
    );

    if (!room) {
      res.status(404).json({ success: false, error: 'Room not found' });
      return;
    }

    try {
      getIO().to(`drive:${driveId}`).emit('room:locked', { roomId, isLocked });
    } catch {}

    res.json({ success: true, data: room });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// POST /drives/:driveId/rooms/:roomId/transfer-student
export const transferStudent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { driveId, roomId } = req.params;
    const { targetRoomId, applicationId } = req.body;

    // Remove from source room
    await RoomModel.findOneAndUpdate(
      { _id: roomId, driveId },
      { $pull: { assignedStudents: applicationId } }
    );

    // Add to target room
    const targetRoom = await RoomModel.findOneAndUpdate(
      { _id: targetRoomId, driveId },
      { $addToSet: { assignedStudents: applicationId } },
      { new: true }
    );

    // Update application with new room ID
    await ApplicationModel.findByIdAndUpdate(applicationId, {
      $set: { assignedRoomId: targetRoomId }
    });

    try {
      getIO().to(`drive:${driveId}`).emit('room:student_transferred', { applicationId, fromRoomId: roomId, toRoomId: targetRoomId });
      getIO().to(`app:${applicationId}`).emit('student:status_changed', { message: `You have been reassigned to ${targetRoom?.name}` });
    } catch {}

    res.json({ success: true, data: { message: 'Transfer successful' } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// GET /drives/:driveId/rooms/:roomId/ewt
import { computeRoomEWT } from '../services/room-assignment.service';

export const getRoomEWT = async (req: Request, res: Response): Promise<void> => {
  try {
    const { driveId, roomId } = req.params;
    
    const room = await RoomModel.findOne({ _id: roomId, driveId }).lean();
    if (!room) {
      res.status(404).json({ success: false, error: 'Room not found' });
      return;
    }

    // Number of students waiting in this round
    const studentQueueSize = (room.assignedStudents?.length || 0);
    const throughputLog = (room as any).throughputLog || [];

    const ewt = computeRoomEWT(studentQueueSize, throughputLog);

    res.json({ success: true, data: ewt });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// POST /drives/:driveId/rooms/rotate-rooms
import { randomAssignWithOverflow } from '../services/room-assignment.service';

export const rotateRooms = async (req: Request, res: Response): Promise<void> => {
  try {
    const { driveId } = req.params;
    const { fromRound, toRound } = req.body;

    // Determine students moving forward
    const students = await ApplicationModel.find({
      driveId,
      currentRound: toRound,
      status: { $in: ['attended', `${toRound}_passed`, `${toRound}_pending`] }
    }).select('_id').lean();

    // Fetch rooms for next round
    const rooms = await RoomModel.find({ driveId, round: toRound }).lean();

    if (rooms.length === 0) {
      res.status(400).json({ success: false, error: 'No rooms configured for target round.' });
      return;
    }

    const roomInputs = rooms.map(r => ({
      _id: r._id.toString(),
      capacity: r.capacity,
      name: r.name,
      isLocked: (r as any).isLocked
    }));

    const studentIds = students.map(s => s._id.toString());
    const result = randomAssignWithOverflow(studentIds, roomInputs);

    // Save
    let totalAssigned = 0;
    for (const assignment of result.assignments) {
      await RoomModel.findByIdAndUpdate(assignment.roomId, {
        $set: { assignedStudents: assignment.studentIds }
      });
      
      // Bulk update students assignedRoomId
      await ApplicationModel.updateMany(
        { _id: { $in: assignment.studentIds } },
        { $set: { assignedRoomId: assignment.roomId } }
      );
      
      totalAssigned += assignment.studentIds.length;
    }

    try {
      getIO().to(`drive:${driveId}`).emit('drive:round_rotated', { fromRound, toRound, totalAssigned });
    } catch {}

    res.json({ success: true, data: { confirmed: true, totalAssigned, overflow: result.unassigned.length } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

