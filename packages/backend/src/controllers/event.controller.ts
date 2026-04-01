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
    const drive = await DriveModel.findById(req.params.driveId).select('eventDate venueDetails reportTime schedule rounds status');
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
    // Anyone who was active but NOT in the passed list
    const failedQuery = {
      driveId,
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

    // Count how many students are currently `attended` — these are the ones who scanned the QR
    const presentCount = await ApplicationModel.countDocuments({ driveId, status: 'attended' });

    if (presentCount === 0) {
      res.status(400).json({ success: false, error: 'No checked-in students found. Make sure students have scanned the QR code first.' });
      return;
    }

    // 1. Advance all attended students to the next round (or select them if this is the last round)
    const advanceUpdate = nextRound
      ? { status: 'shortlisted', currentRound: nextRound.type }
      : { status: 'selected', currentRound: 'completed' };

    const advanceResult = await ApplicationModel.updateMany(
      { driveId, status: 'attended' },
      { $set: advanceUpdate }
    );

    // 2. Reject all who are still in 'applied' state (never scanned in — no-shows)
    const rejectResult = await ApplicationModel.updateMany(
      { driveId, status: 'applied' },
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
