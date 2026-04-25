import { RoomModel, DriveModel, ApplicationModel, StudentProfileModel } from '../models';
import { EvaluationModel } from '../models/evaluation.model';
import { getIO } from '../socket';

export class EvaluationService {
  static async getDashboardData(payload: any) {
    const room = await RoomModel.findById(payload.roomId).lean();
    if (!room) throw new Error('Room not found');

    const drive = await DriveModel.findById(payload.driveId).select('companyName jobRole rounds isPaused scorecardTraits').lean();

    const applications = await ApplicationModel.find({
      _id: { $in: room.assignedStudents || [] },
      currentRound: payload.round
    }).select('status currentRound data.name data.fullName data.usn data.branch data.imageURL data.resumeUrl data.skills').lean();

    const evaluatedApps = await EvaluationModel.find({
      roomId: payload.roomId,
      roundType: payload.round
    }).select('applicationId decision').lean();

    const evaluatedAppIds = evaluatedApps.map((e: any) => e.applicationId.toString());

    const usnList = applications.map((app: any) => app.data?.usn || app.data?.USN).filter(Boolean);
    const profiles = await StudentProfileModel.find({ usn: { $in: usnList } }).select('usn parsedResume parsingStatus').lean();

    const waiting = applications.filter((app: any) => !evaluatedAppIds.includes(app._id.toString())).map((app: any) => {
      const usn = app.data?.usn || app.data?.USN;
      const profile = profiles.find((p: any) => p.usn === usn);
      return { ...app, parsedResume: profile?.parsedResume || null, parsingStatus: profile?.parsingStatus || null };
    });
    
    const evaluated = applications.filter((app: any) => evaluatedAppIds.includes(app._id.toString())).map((app: any) => {
      const evalData = evaluatedApps.find((e: any) => e.applicationId.toString() === app._id.toString());
      return { ...app, decision: evalData?.decision };
    });

    return {
      roomName: room.name,
      round: payload.round,
      driveDetails: drive,
      waiting,
      evaluated
    };
  }

  static async evaluateStudent(payload: any, appId: string, body: any) {
    const { scores, comments, decision, evaluatorName } = body;

    const application = await ApplicationModel.findById(appId);
    if (!application) throw new Error('Application not found');

    if (application.currentRound !== payload.round) throw new Error('Student is no longer in this round.');

    const drive = await DriveModel.findById(payload.driveId);
    if (!drive) throw new Error('Drive missing');

    if ((drive as any).isPaused) throw new Error('Operations for this drive are suspended.');

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

    if (decision === 'Fail') {
      application.status = 'rejected';
      await application.save();
    } else if (decision === 'Pass') {
      const currentRoundIdx = drive.rounds.findIndex((r: any) => r.type === application.currentRound);
      const nextRound = drive.rounds[currentRoundIdx + 1];

      if (nextRound) {
        application.status = 'shortlisted';
        application.currentRound = nextRound.type;
      } else {
        application.status = 'selected';
        application.currentRound = 'completed';
      }
      await application.save();
    }

    const io = getIO();
    io.to(`drive:${payload.driveId}`).emit('invigilator:evaluation_submitted', {
      applicationId: application._id.toString(),
      roomId: payload.roomId,
      roundType: payload.round,
      decision,
      evaluatorName: evaluatorName || 'Panelist',
    });
    io.to(`app:${application._id}`).emit('student:status_changed', {
      status: application.status,
      currentRound: application.currentRound
    });
    io.to(`drive:${payload.driveId}`).emit('drive:round_batch_updated', {
      roundType: payload.round,
      source: 'panelist_evaluation'
    });

    return { status: application.status, currentRound: application.currentRound };
  }
}
