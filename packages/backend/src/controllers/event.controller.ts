import { Request, Response } from 'express';
import { DriveModel, RoomModel } from '../models';
import { getIO } from '../socket';

export const updateEventSetup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { driveId } = req.params;
    const { hallName, capacity, eventDate, schedule } = req.body;
    
    const drive = await DriveModel.findByIdAndUpdate(driveId, {
      $set: {
        eventDate,
        venueDetails: { hallName, capacity },
        schedule
      }
    }, { new: true });

    if (!drive) {
      res.status(404).json({ success: false, error: 'Drive not found' });
      return;
    }

    getIO().to(`drive:${driveId}`).emit('event:setup_updated', drive);
    res.json({ success: true, data: drive });
  } catch (error: any) {
    console.error("updateEventSetup ERROR:", error);
    res.status(500).json({ success: false, error: error.message || 'Failed to update event setup' });
  }
};

export const getEventSetup = async (req: Request, res: Response): Promise<void> => {
  try {
    const drive = await DriveModel.findById(req.params.driveId).select('eventDate venueDetails schedule rounds');
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
        r.status = r.type === roundType ? 'active' : 'pending';
      });
      await drive.save();
    }

    getIO().to(`drive:${driveId}`).emit('round:status_changed', {
      roundType,
      status: 'active',
      timestamp: new Date()
    });

    res.json({ success: true, data: drive.rounds });
  } catch (error: any) {
    console.error("activateRound ERROR:", error);
    res.status(500).json({ success: false, error: error.message || 'Failed to activate round' });
  }
};
