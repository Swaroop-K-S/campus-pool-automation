import { Request, Response } from 'express';
import { RoomModel, DriveModel, ApplicationModel } from '../models';
import { EvaluationModel } from '../models/evaluation.model';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { getIO } from '../socket';

// 1. GENERATE MAGIC LINK (Admin only, mounted in drive/room routes ideally, but handled here for cohesion)
export const generateMagicLink = async (req: Request, res: Response): Promise<void> => {
  try {
    const { roomId } = req.params;
    const { panelistEmail } = req.body;
    
    if (!panelistEmail) { res.status(400).json({ success: false, error: 'panelistEmail is required' }); return; }

    const room = await RoomModel.findById(roomId);
    if (!room) { res.status(404).json({ success: false, error: 'Room not found' }); return; }

    const isPanelist = room.panelists?.some(p => p.email === panelistEmail);
    if (!isPanelist) { res.status(400).json({ success: false, error: 'Email is not assigned to this room panel' }); return; }

    const payload = {
      roomId: room._id,
      driveId: room.driveId,
      round: room.round,
      email: panelistEmail,
      role: 'invigilator'
    };

    // 24 hour expiry
    const token = jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: '24h' });
    
    // Construct the full frontend URL
    const url = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/invigilator/${token}`;

    res.json({ success: true, data: { url, token } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 2. GET DASHBOARD (Invigilator)
export const getDashboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const payload = (req as any).invigilatorPayload;
    
    const room = await RoomModel.findById(payload.roomId).lean();
    if (!room) { res.status(404).json({ success: false, error: 'Room not found' }); return; }

    const drive = await DriveModel.findById(payload.driveId).select('companyName jobRole rounds isPaused rubricSchema').lean();

    // Find all applications currently assigned to this room and physically in this round
    const applications = await ApplicationModel.find({
      _id: { $in: room.assignedStudents || [] },
      currentRound: payload.round
    }).select('status currentRound data.name data.fullName data.usn data.branch data.imageURL data.resumeUrl data.skills').lean();

    // Check which ones have already been evaluated in THIS round
    const evaluatedApps = await EvaluationModel.find({
      roomId: payload.roomId,
      roundType: payload.round
    }).select('applicationId decision').lean();

    const evaluatedAppIds = evaluatedApps.map((e: any) => e.applicationId.toString());

    // Separate into Waiting vs Evaluated
    const waiting = applications.filter((app: any) => !evaluatedAppIds.includes(app._id.toString()));
    const evaluated = applications.filter((app: any) => evaluatedAppIds.includes(app._id.toString())).map((app: any) => {
      const evalData = evaluatedApps.find((e: any) => e.applicationId.toString() === app._id.toString());
      return { ...app, decision: evalData?.decision };
    });

    res.json({
      success: true,
      data: {
        roomName: room.name,
        round: payload.round,
        driveDetails: drive,
        waiting,
        evaluated
      }
    });

  } catch (error: any) {
    if (error.name === 'TokenExpiredError' || error.message.includes('token')) {
      res.status(401).json({ success: false, error: 'Magic link expired or invalid.' });
    } else {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

// 3. EVALUATE STUDENT (Invigilator)
export const evaluateStudent = async (req: Request, res: Response): Promise<void> => {
  try {
    const payload = (req as any).invigilatorPayload;
    const { appId } = req.params;
    const { scores, comments, decision, evaluatorName } = req.body;

    const application = await ApplicationModel.findById(appId);
    if (!application) { res.status(404).json({ success: false, error: 'Application not found' }); return; }

    if (application.currentRound !== payload.round) {
      res.status(400).json({ success: false, error: 'Student is no longer in this round.' });
      return;
    }

    const drive = await DriveModel.findById(payload.driveId);
    if (!drive) throw new Error('Drive missing');

    if ((drive as any).isPaused) {
      res.status(423).json({ success: false, error: 'Operations for this drive are currently completely suspended by the Administrator.' });
      return;
    }

    // 1. Save Evaluation Record
    await EvaluationModel.create({
      applicationId: application._id,
      driveId: payload.driveId,
      roomId: payload.roomId,
      roundType: payload.round,
      evaluatorName: evaluatorName || 'Panelist',
      scores,
      comments,
      decision
    });

    const currentRoundObj = drive.rounds.find(r => r.type === application.currentRound);
    
    // 2. Execute the Auto-Routing Magic
    if (decision === 'Fail') {
      application.status = 'rejected';
      await application.save();
    } else if (decision === 'Pass') {
      // Find the NEXT round physically
      const currentRoundIdx = drive.rounds.findIndex(r => r.type === application.currentRound);
      const nextRound = drive.rounds[currentRoundIdx + 1];

      if (nextRound) {
        application.status = 'shortlisted';
        application.currentRound = nextRound.type;
      } else {
        application.status = 'selected';
        application.currentRound = 'completed'; // Hired!
      }
      await application.save();
    }

    // 3. Emit Real-Time Socket Updates
    const io = getIO();
    // Targeted event for God View evaluation counter
    io.to(`drive:${payload.driveId}`).emit('invigilator:evaluation_submitted', {
      applicationId: application._id.toString(),
      roomId: payload.roomId,
      roundType: payload.round,
      decision,
      evaluatorName: evaluatorName || 'Panelist',
    });
    // Student-facing status update
    io.to(`app:${application._id}`).emit('student:status_changed', {
      status: application.status,
      currentRound: application.currentRound
    });
    // General batch refresh for round views
    io.to(`drive:${payload.driveId}`).emit('drive:round_batch_updated', {
      roundType: payload.round,
      source: 'panelist_evaluation'
    });

    res.json({ success: true, data: { status: application.status, currentRound: application.currentRound } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
