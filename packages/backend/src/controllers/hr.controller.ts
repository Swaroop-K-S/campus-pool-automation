import { Request, Response } from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import bcrypt from 'bcrypt';
import { DriveModel, ApplicationModel, RoomModel } from '../models';
import { UserModel } from '../models/user.model';
import { asyncHandler } from '../utils/async-handler';
import { getIO } from '../socket';

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
    .select('companyName jobRole ctc locations eventDate reportTime venueDetails rounds status isPaused schedule')
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
      .select('status currentRound driveStudentId referenceNumber data attendedAt submittedAt assignedRoomId')
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

  rows.forEach(row => {
    Object.keys(row).forEach(k => {
      const nk = normalizeKey(k);
      if (['usn', 'rollno', 'regno', 'registrationnumber'].includes(nk)) {
        const val = String(row[k] || '').toUpperCase().trim();
        if (val) passedUSNs.push(val);
      }
      if (['email', 'emailid', 'emailaddress'].includes(nk)) {
        const val = String(row[k] || '').toLowerCase().trim();
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
  const roundStudents = await ApplicationModel.find({
    driveId,
    currentRound: roundType,
    status: { $nin: ['rejected', 'selected'] },
  }).lean() as any[];

  const passed: string[] = [];
  const failed: string[] = [];
  const notFound: string[] = [];

  // Match by USN or email from application data
  for (const app of roundStudents) {
    const d = app.data || {};
    const appUSN = (d.usn || d.USN || d.roll_no || '').toString().toUpperCase().trim();
    const appEmail = (d.email || d.Email || '').toString().toLowerCase().trim();

    const isPass =
      (appUSN && passedUSNs.includes(appUSN)) ||
      (appEmail && passedEmails.includes(appEmail));

    if (isPass) {
      passed.push(app._id.toString());
    } else {
      failed.push(app._id.toString());
    }
  }

  // Detect unmatched rows in the file
  passedUSNs.forEach(usn => {
    if (!roundStudents.some(a => (a.data?.usn || a.data?.USN || '').toString().toUpperCase() === usn)) {
      notFound.push(usn);
    }
  });

  // Determine next round for passing students
  const currentIdx = drive.rounds.findIndex(r => r.type === roundType);
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
      }
    ),
    ApplicationModel.updateMany(
      { _id: { $in: failed } },
      { $set: { status: 'rejected' } }
    ),
  ]);

  // Broadcast to all connected clients
  try {
    getIO().to(`drive:${driveId}`).emit('drive:round_results_uploaded', {
      roundType,
      passed: passed.length,
      failed: failed.length,
    });
  } catch { /* non-fatal */ }

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
    return res.status(400).json({ success: false, error: 'name, email, password, and driveId are required' });
  }

  const drive = await DriveModel.findById(driveId).lean();
  if (!drive) return res.status(404).json({ success: false, error: 'Drive not found' });

  const exists = await UserModel.findOne({ email }).lean();
  if (exists) return res.status(409).json({ success: false, error: 'An account with this email already exists' });

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

