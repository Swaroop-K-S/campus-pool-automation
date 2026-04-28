import { Request, Response } from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import bcrypt from 'bcrypt';
import { DriveModel, ApplicationModel, RoomModel } from '../models';
import { UserModel } from '../models/user.model';
import { asyncHandler } from '../utils/async-handler';
import { getIO } from '../socket';
import { VectorService } from '../services/vector.service';

// Multer: memory storage for parsing uploaded pass-list files
export const hrUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ];
    cb(null, allowed.includes(file.mimetype));
  },
});

// Helper to get scoped driveId from JWT payload for HR users
const getHRDriveId = (req: Request): string => {
  const driveId = req.user?.driveId;
  if (!driveId) throw new Error('No drive assigned to this HR account');
  return driveId.toString();
};

// ── GET /api/v1/hr/dashboard ────────────────────────────────────────────
// Drive overview: company info, event date, funnel counts
export const getHRDashboard = asyncHandler(async (req: Request, res: Response) => {
  const driveId = getHRDriveId(req);

  const drive = await DriveModel.findById(driveId)
    .select(
      'companyName jobRole ctc locations eventDate reportTime venueDetails rounds status isPaused schedule',
    )
    .lean();
  if (!drive) return res.status(404).json({ success: false, error: 'Drive not found' });

  // Aggregate status funnel
  const counts = await ApplicationModel.aggregate([
    { $match: { driveId: drive._id } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  const funnel = { applied: 0, shortlisted: 0, attended: 0, selected: 0, rejected: 0, total: 0 };
  counts.forEach(({ _id, count }: any) => {
    funnel.total += count;
    if (_id === 'applied') funnel.applied = count;
    else if (_id === 'shortlisted') funnel.shortlisted = count;
    else if (_id === 'attended') funnel.attended = count;
    else if (_id === 'selected') funnel.selected = count;
    else if (_id === 'rejected') funnel.rejected = count;
  });

  res.json({ success: true, data: { drive, funnel } });
});

// ── GET /api/v1/hr/students ─────────────────────────────────────────────
// Read-only paginated student list for current active round
export const getHRStudents = asyncHandler(async (req: Request, res: Response) => {
  const driveId = getHRDriveId(req);
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const status = req.query.status as string | undefined;
  const round = req.query.round as string | undefined;

  const filter: any = { driveId };
  if (status && status !== 'all') filter.status = status;
  if (round) filter.currentRound = round;

  const [applications, total] = await Promise.all([
    ApplicationModel.find(filter)
      .select(
        'status currentRound driveStudentId referenceNumber data attendedAt submittedAt assignedRoomId',
      )
      .populate('assignedRoomId', 'name floor round')
      .sort({ submittedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    ApplicationModel.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: {
      applications,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    },
  });
});

// ── POST /api/v1/hr/rounds/:roundType/results ───────────────────────────
// Upload pass-list XLSX/CSV — advance/fail students in specified round
export const uploadHRRoundResults = asyncHandler(async (req: Request, res: Response) => {
  const driveId = getHRDriveId(req);
  const { roundType } = req.params;

  if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });

  const drive = await DriveModel.findById(driveId);
  if (!drive) return res.status(404).json({ success: false, error: 'Drive not found' });

  // Parse XLSX / CSV using the xlsx library (consistent with shortlist controller)
  const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' }) as Record<string, any>[];

  if (rows.length === 0) {
    return res.status(400).json({ success: false, error: 'Uploaded file contains no data rows' });
  }

  // Detect USN / email columns by header key normalisation
  const normalizeKey = (k: string) => k.toLowerCase().replace(/[\s_-]/g, '');
  const passedUSNs: string[] = [];
  const passedEmails: string[] = [];

  rows.forEach((row) => {
    Object.keys(row).forEach((k) => {
      const nk = normalizeKey(k);
      if (['usn', 'rollno', 'regno', 'registrationnumber'].includes(nk)) {
        const val = String(row[k] || '')
          .toUpperCase()
          .trim();
        if (val) passedUSNs.push(val);
      }
      if (['email', 'emailid', 'emailaddress'].includes(nk)) {
        const val = String(row[k] || '')
          .toLowerCase()
          .trim();
        if (val) passedEmails.push(val);
      }
    });
  });

  if (passedUSNs.length === 0 && passedEmails.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'File must have a column containing "USN" or "Email"',
    });
  }

  // Find students currently in this drive + this round
  const roundStudents = (await ApplicationModel.find({
    driveId,
    currentRound: roundType,
    status: { $nin: ['rejected', 'selected'] },
  }).lean()) as any[];

  const passed: string[] = [];
  const failed: string[] = [];
  const notFound: string[] = [];

  // Match by USN or email from application data
  for (const app of roundStudents) {
    const d = app.data || {};
    const appUSN = (d.usn || d.USN || d.roll_no || '').toString().toUpperCase().trim();
    const appEmail = (d.email || d.Email || '').toString().toLowerCase().trim();

    const isPass =
      (appUSN && passedUSNs.includes(appUSN)) || (appEmail && passedEmails.includes(appEmail));

    if (isPass) {
      passed.push(app._id.toString());
    } else {
      failed.push(app._id.toString());
    }
  }

  // Detect unmatched rows in the file
  passedUSNs.forEach((usn) => {
    if (
      !roundStudents.some(
        (a) => (a.data?.usn || a.data?.USN || '').toString().toUpperCase() === usn,
      )
    ) {
      notFound.push(usn);
    }
  });

  // Determine next round for passing students
  const currentIdx = drive.rounds.findIndex((r) => r.type === roundType);
  const nextRound = drive.rounds[currentIdx + 1];

  // Bulk updates
  const [passUpdate, failUpdate] = await Promise.all([
    ApplicationModel.updateMany(
      { _id: { $in: passed } },
      {
        $set: {
          status: nextRound ? 'shortlisted' : 'selected',
          currentRound: nextRound ? nextRound.type : 'completed',
        },
      },
    ),
    ApplicationModel.updateMany({ _id: { $in: failed } }, { $set: { status: 'rejected' } }),
  ]);

  // Broadcast to all connected clients
  try {
    getIO().to(`drive:${driveId}`).emit('drive:round_results_uploaded', {
      roundType,
      passed: passed.length,
      failed: failed.length,
    });
  } catch {
    /* non-fatal */
  }

  res.json({
    success: true,
    data: {
      roundType,
      passed: passUpdate.modifiedCount,
      failed: failUpdate.modifiedCount,
      notFound,
      nextRound: nextRound?.type || 'final',
    },
  });
});

// ── GET /api/v1/hr/rooms ────────────────────────────────────────────────
// Read-only room card view: rooms + panelists + assigned students
export const getHRRooms = asyncHandler(async (req: Request, res: Response) => {
  const driveId = getHRDriveId(req);
  const round = req.query.round as string | undefined;

  const filter: any = { driveId };
  if (round) filter.round = round;

  const rooms = await RoomModel.find(filter)
    .populate({
      path: 'assignedStudents',
      select: 'status currentRound driveStudentId data',
      model: 'Application',
    })
    .lean();

  res.json({ success: true, data: rooms });
});

// ── POST /api/v1/hr/create-account ─────────────────────────────────────
// Admin creates a company_hr user scoped to a specific drive
export const createHRAccount = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password, driveId } = req.body;

  if (!name || !email || !password || !driveId) {
    return res
      .status(400)
      .json({ success: false, error: 'name, email, password, and driveId are required' });
  }

  const drive = await DriveModel.findById(driveId).lean();
  if (!drive) return res.status(404).json({ success: false, error: 'Drive not found' });

  const exists = await UserModel.findOne({ email }).lean();
  if (exists)
    return res
      .status(409)
      .json({ success: false, error: 'An account with this email already exists' });

  const passwordHash = await bcrypt.hash(password, 10);

  const hrUser = await UserModel.create({
    name,
    email,
    passwordHash,
    role: 'company_hr',
    collegeId: req.user?.collegeId,
    driveId,
    isActive: true,
    failedLoginAttempts: 0,
  });

  res.status(201).json({
    success: true,
    data: {
      userId: hrUser._id,
      name: hrUser.name,
      email: hrUser.email,
      role: hrUser.role,
      driveId,
    },
  });
});

// ── POST /api/v1/hr/next-candidate ─────────────────────────────────────
// The Algorithmic Load Balancer endpoint
export const getNextCandidate = asyncHandler(async (req: Request, res: Response) => {
  const driveId = getHRDriveId(req);
  const roomId = req.user?.roomId; // Assume HR token or session has their current room context
  // If HR doesn't have a strict room assigned in token, we might need them to pass it, but let's assume they pass it in body for now
  const targetRoomId = req.body.roomId || roomId;

  if (!targetRoomId) {
    return res
      .status(400)
      .json({ success: false, error: 'Room ID is required to summon candidate' });
  }

  const drive = await DriveModel.findById(driveId).lean();
  if (!drive) return res.status(404).json({ success: false, error: 'Drive not found' });

  // 1. Generate JD Text
  const jdText = `Company: ${drive.companyName}. Role: ${drive.jobRole}. CTC: ${drive.ctc}. Locations: ${drive.locations?.join(', ') || 'Pan India'}. Branches allowed: ${drive.eligibility?.branches?.join(', ') || 'Any'}`;

  // 2. Query Vector ATS for top 500 matches
  const rankedResults = await VectorService.searchCandidates(jdText, 500);

  // 3. Find available, checked-in students for this drive
  const availableApps = await ApplicationModel.find({
    driveId,
    attendedAt: { $exists: true, $ne: null }, // Physically in the building
    assignedRoomId: null, // Not currently in an interview
    status: { $nin: ['rejected', 'selected'] }, // Still in the running
  })
    .select('_id data currentRound')
    .lean();

  if (availableApps.length === 0) {
    return res
      .status(404)
      .json({ success: false, error: 'No available checked-in candidates found.' });
  }

  // 4. Map available applications by normalized USN
  const appMap = new Map<string, any>();
  for (const app of availableApps) {
    const usn = (app.data?.usn || app.data?.USN || app.data?.roll_no || '')
      .toString()
      .toLowerCase()
      .trim();
    if (usn) appMap.set(usn, app);
  }

  // 5. Find the highest ranked available candidate
  let bestApp = null;
  let matchScore = 0;

  for (const rank of rankedResults) {
    const usn = (rank.usn || '').toLowerCase().trim();
    if (appMap.has(usn)) {
      bestApp = appMap.get(usn);
      matchScore = rank.score;
      break; // Found the #1 available match!
    }
  }

  // Fallback: If vector results don't cover available apps, just pick the first available one (e.g. queue order)
  if (!bestApp) {
    bestApp = availableApps[0];
    matchScore = 0; // Unknown semantic match
  }

  // 6. Update Application state and start latency stopwatch
  await ApplicationModel.updateOne(
    { _id: bestApp._id },
    { $set: { assignedRoomId: targetRoomId, summonedAt: new Date() } },
  );

  // 7. Get Room details to send to student
  const room = await RoomModel.findById(targetRoomId).select('name').lean();
  const roomName = room?.name || 'Interview Room';

  // 8. Fire WebSocket Event to Student's Phone
  const io = getIO();
  io.to(`app:${bestApp._id.toString()}`).emit('student:summoned', { roomName });

  // 9. Twilio / PWA Push Fallback
  try {
    const appData = bestApp.data as Record<string, any>;
    const phoneKey = Object.keys(appData).find(
      (k) => k.toLowerCase().includes('phone') || k.toLowerCase().includes('mobile'),
    );
    if (phoneKey && appData[phoneKey]) {
      const phoneStr = appData[phoneKey].toString();
      const finalPhone = phoneStr.startsWith('+') ? phoneStr : `+91${phoneStr}`;
      const { sendSMS } = await import('../services/twilio.service');
      // Firing SMS in background, don't await blocking
      sendSMS(
        finalPhone,
        `CampusPool AI: You have been selected! Please head to Room ${roomName} immediately for your interview.`,
      ).catch(console.error);
    }
  } catch (err) {
    console.error('Failed to dispatch SMS fallback', err);
  }

  res.status(200).json({
    success: true,
    data: {
      applicationId: bestApp._id,
      name: bestApp.data?.name || bestApp.data?.fullName || bestApp.data?.full_name || 'Unknown',
      usn: bestApp.data?.usn || bestApp.data?.USN || 'Unknown',
      matchScore: Math.round(matchScore * 100),
      roomName,
      // Pass along the parsed resume/vector context if available in data
      candidateContext: bestApp.data,
    },
  });

  // Refresh God View Telemetry immediately so room card turns yellow
  io.to(`drive:${driveId}:admin`).emit('drive:telemetry_updated');
});

// ── POST /api/v1/hr/interview-result ───────────────────────────────────
// The Interrogation Engine: Receives rubric scores and decision
export const submitInterviewResult = asyncHandler(async (req: Request, res: Response) => {
  const driveId = getHRDriveId(req);
  const { applicationId, scores, feedback, decision } = req.body;

  if (!applicationId || !decision) {
    return res
      .status(400)
      .json({ success: false, error: 'applicationId and decision are required' });
  }

  const app = await ApplicationModel.findOne({ _id: applicationId, driveId }).lean();
  if (!app) {
    return res.status(404).json({ success: false, error: 'Application not found' });
  }

  const drive = await DriveModel.findById(driveId).lean();
  if (!drive) return res.status(404).json({ success: false, error: 'Drive not found' });

  // 1. Determine next round if advancing
  let nextRoundType = app.currentRound;
  let newStatus = app.status;

  if (decision === 'reject') {
    newStatus = 'rejected';
  } else if (decision === 'hire') {
    newStatus = 'selected';
  } else if (decision === 'advance') {
    newStatus = 'shortlisted';
    // Find the current round index
    const currentIdx = drive.rounds.findIndex((r) => r.type === app.currentRound);
    const nextRound = drive.rounds[currentIdx + 1];
    if (nextRound) {
      nextRoundType = nextRound.type;
    } else {
      // No more rounds, implicitly select
      newStatus = 'selected';
    }
  } else {
    return res.status(400).json({ success: false, error: 'Invalid decision' });
  }

  // 2. Prepare Data Payload (injecting the rubric scores)
  const currentData = (app.data as Record<string, any>) || {};

  // Calculate duration from summonedAt stop-watch
  const durationMinutes = app.summonedAt
    ? Math.max(1, Math.round((Date.now() - new Date(app.summonedAt).getTime()) / 60000))
    : 0;

  const newInterviewLog = {
    date: new Date(),
    panelist: req.user?.name || 'HR Panelist',
    round: app.currentRound,
    durationMinutes,
    scores,
    feedback,
    decision,
  };

  // Append to interview history
  const interviewHistory = currentData.interviewHistory || [];
  interviewHistory.push(newInterviewLog);
  const updatedData = { ...currentData, interviewHistory };

  // 3. Update the database
  await ApplicationModel.updateOne(
    { _id: applicationId },
    {
      $set: {
        status: newStatus,
        currentRound: nextRoundType,
        assignedRoomId: null, // Critical: Frees up the student and room!
        summonedAt: null, // Critical: Stops the stopwatch
        data: updatedData,
      },
    },
  );

  // 4. Fire WebSockets
  const io = getIO();
  if (newStatus === 'selected') {
    io.to(`app:${applicationId}`).emit('student:selected', { applicationId });
  } else {
    io.to(`app:${applicationId}`).emit('student:status_changed', {
      status: newStatus,
      message:
        newStatus === 'rejected'
          ? 'Thank you for participating.'
          : 'You have advanced to the next round!',
    });
  }

  // Refresh God View Telemetry
  io.to(`drive:${driveId}:admin`).emit('drive:telemetry_updated');
  io.to(`drive:${driveId}`).emit('drive:shortlist_updated'); // Generic refresh trigger

  res.status(200).json({ success: true, message: 'Interview result logged successfully' });
});
