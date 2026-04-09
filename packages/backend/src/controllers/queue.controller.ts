import { Request, Response } from 'express';
import { ApplicationModel, RoomModel, DriveModel } from '../models';
import { asyncHandler } from '../utils/async-handler';
import mongoose from 'mongoose';

// GET /api/v1/event/:driveId/queue/:appId
export const getQueueStatus = asyncHandler(async (req: Request, res: Response) => {
  const { driveId, appId } = req.params;

  const application = await ApplicationModel.findOne({ _id: appId, driveId }).lean();
  if (!application) {
    return res.status(404).json({ success: false, error: 'Application not found' });
  }

  const drive = await DriveModel.findById(driveId).lean();
  if (!drive || !(drive as any).enableQueueTracking) {
    // If tracking is off or drive doesn't exist, we just return empty
    return res.status(200).json({ success: true, data: { position: null, estimatedWaitTime: null } });
  }

  // If application is no longer actively in a round (rejected/selected)
  if (['rejected', 'selected', 'completed'].includes(application.status)) {
    return res.status(200).json({ success: true, data: { position: 0, estimatedWaitTime: 0 } });
  }

  const currentRound = application.currentRound;
  if (!currentRound || currentRound === 'completed') {
    return res.status(200).json({ success: true, data: { position: 0, estimatedWaitTime: 0 } });
  }

  // Find the room this student is assigned to for this specific round
  const assignedRoom = await RoomModel.findOne({
    driveId,
    round: currentRound,
    assignedStudents: application._id
  });

  if (!assignedRoom) {
     return res.status(200).json({ success: true, data: { position: null, estimatedWaitTime: null, message: "Awaiting room assignment" } });
  }

  // Find all applications assigned to this room that are still actively IN this round (i.e. haven't been completed/routed yet)
  // Let's rely on the order of `assignedStudents` array as the queue order.
  const assignedAppIds = assignedRoom.assignedStudents || [];
  
  // Find which of these students are still in the same round status. 
  // If their `currentRound` has progressed or their status became `rejected`, they left the queue.
  const peerDocs = await ApplicationModel.find({
    _id: { $in: assignedAppIds },
    currentRound: currentRound, 
    status: { $nin: ['rejected', 'selected', 'completed'] }
  }).select('_id status').lean();

  const peerIdsMap = new Set(peerDocs.map(d => d._id.toString()));

  // Calculate position preserving assignment order
  let position = 0;
  let foundSelf = false;

  for (const studentId of assignedAppIds) {
    const sIdStr = typeof studentId === 'string' ? studentId : (studentId as mongoose.Types.ObjectId).toString();
    
    // Only count students who are still actively waiting (present in peerIdsMap)
    if (peerIdsMap.has(sIdStr)) {
      position++;
      if (sIdStr === appId.toString()) {
        foundSelf = true;
        break;
      }
    }
  }

  if (!foundSelf) {
     // Failsafe 
     position = 1; 
  }

  const APP_DURATION_MINS = 15; // Assume 15 min per interview slot as base default
  // Rough estimate: queue position * duration / panelists. For simple UI, Assume 1 panelist = 15 mins.
  const panelistsCount = assignedRoom.panelists?.length || 1;
  const estimatedWaitTime = Math.ceil((position - 1) * APP_DURATION_MINS / panelistsCount);

  res.status(200).json({
    success: true,
    data: {
      position,
      estimatedWaitTime,
      roomName: assignedRoom.name,
      totalRemaining: peerIdsMap.size
    }
  });
});
