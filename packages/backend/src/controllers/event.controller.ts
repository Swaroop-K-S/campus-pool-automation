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
