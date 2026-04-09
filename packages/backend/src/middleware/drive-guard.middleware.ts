import { Request, Response, NextFunction } from 'express';
import { DriveModel, RoomModel } from '../models';
import { asyncHandler } from '../utils/async-handler';

export const driveGuard = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  let driveId = req.params.driveId || req.body.driveId;

  // If there is no driveId but there is a roomId, fetch the driveId from the room
  const roomId = req.params.roomId || req.body.roomId;
  if (!driveId && roomId) {
    const room = await RoomModel.findById(roomId).select('driveId').lean();
    if (room) driveId = room.driveId;
  }

  if (!driveId) {
    // If no drive ID is contextually passed or deduced, we can't guard it per-drive, so pass through.
    return next();
  }

  const drive = await DriveModel.findById(driveId).select('isPaused').lean();

  if (drive && (drive as any).isPaused) {
    return res.status(423).json({
      success: false,
      error: 'Operations for this drive are currently completely suspended by the Administrator.',
      code: 'DRIVE_PAUSED'
    });
  }

  next();
});
