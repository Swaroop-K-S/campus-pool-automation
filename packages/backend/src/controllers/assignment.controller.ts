import { Request, Response } from 'express';
import { DriveModel, ApplicationModel, RoomModel } from '../models';
import { randomAssign, aiSuggestAssign, calcOverallMatchQuality } from '../services/room-assignment.service';
import { getIO } from '../socket';
import * as XLSX from 'xlsx';

// POST /drives/:driveId/rooms/auto-assign/:roundType
export const autoAssign = async (req: Request, res: Response): Promise<void> => {
  try {
    const { driveId, roundType } = req.params;

    const students = await ApplicationModel.find({
      driveId,
      status: { $in: ['attended', 'shortlisted', 'invited', 'applied', `${roundType}_passed`] }
    }).select('_id data.branch data.name data.fullName').lean();

    const rooms = await RoomModel.find({ driveId, round: roundType }).lean();

    if (rooms.length === 0) {
      res.status(400).json({ success: false, error: 'No rooms configured for this round. Add rooms first.' });
      return;
    }

    const totalCapacity = rooms.reduce((s, r) => s + (r.capacity || 0), 0);
    if (totalCapacity < students.length) {
      res.status(400).json({
        success: false,
        error: 'Insufficient room capacity',
        studentsCount: students.length,
        totalCapacity,
        shortage: students.length - totalCapacity
      });
      return;
    }

    const studentIds = students.map(s => s._id.toString());
    const roomInputs = rooms.map(r => ({
      _id: r._id.toString(),
      capacity: r.capacity,
      name: r.name
    }));

    const assignments = randomAssign(studentIds, roomInputs);

    // Enrich with student names
    const studentMap = new Map(students.map(s => [
      s._id.toString(),
      { name: s.data?.fullName || s.data?.name || 'Unknown', branch: s.data?.branch || '' }
    ]));
    const roomMap = new Map(rooms.map(r => [r._id.toString(), r.name]));

    const enriched = assignments.map(a => ({
      ...a,
      roomName: roomMap.get(a.roomId) || '',
      students: a.studentIds.map(id => ({
        _id: id,
        ...(studentMap.get(id) || { name: 'Unknown', branch: '' })
      }))
    }));

    res.json({
      success: true,
      data: {
        assignments: enriched,
        totalStudents: students.length,
        overflow: Math.max(0, students.length - totalCapacity),
        message: 'Preview generated. Confirm to save.'
      }
    });
  } catch (error: any) {
    console.error('autoAssign ERROR:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// POST /drives/:driveId/rooms/ai-suggest/:roundType
export const aiSuggest = async (req: Request, res: Response): Promise<void> => {
  try {
    const { driveId, roundType } = req.params;

    const students = await ApplicationModel.find({
      driveId,
      status: { $in: ['attended', 'shortlisted', 'invited', 'applied', `${roundType}_passed`] }
    }).select('_id data.branch data.name data.fullName').lean();

    const rooms = await RoomModel.find({ driveId, round: roundType }).lean();

    if (rooms.length === 0) {
      res.status(400).json({ success: false, error: 'No rooms configured for this round.' });
      return;
    }

    const studentInputs = students.map(s => ({
      _id: s._id.toString(),
      branch: s.data?.branch || '',
      name: s.data?.fullName || s.data?.name || ''
    }));
    const roomInputs = rooms.map(r => ({
      _id: r._id.toString(),
      capacity: r.capacity,
      name: r.name,
      panelists: (r.panelists || []).map((p: any) => ({
        name: p.name,
        expertise: p.expertise || []
      }))
    }));

    const assignments = aiSuggestAssign(studentInputs, roomInputs);
    const overallMatch = calcOverallMatchQuality(assignments);

    const studentMap = new Map(students.map(s => [
      s._id.toString(),
      { name: s.data?.fullName || s.data?.name || 'Unknown', branch: s.data?.branch || '' }
    ]));
    const roomMap = new Map(rooms.map(r => [r._id.toString(), r.name]));

    const enriched = assignments.map(a => ({
      ...a,
      roomName: roomMap.get(a.roomId) || '',
      students: a.studentIds.map(id => ({
        _id: id,
        ...(studentMap.get(id) || { name: 'Unknown', branch: '' })
      }))
    }));

    res.json({
      success: true,
      data: {
        assignments: enriched,
        totalStudents: students.length,
        overallMatchQuality: overallMatch,
        message: 'AI suggestions generated. Review and confirm.'
      }
    });
  } catch (error: any) {
    console.error('aiSuggest ERROR:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// POST /drives/:driveId/rooms/confirm-assignments
export const confirmAssignments = async (req: Request, res: Response): Promise<void> => {
  try {
    const { driveId } = req.params;
    const { roundType, assignments } = req.body;

    let totalAssigned = 0;
    for (const { roomId, studentIds } of assignments) {
      await RoomModel.findOneAndUpdate(
        { _id: roomId, driveId },
        { assignedStudents: studentIds }
      );
      totalAssigned += studentIds.length;
    }

    try {
      getIO().to(`drive:${driveId}`).emit('assignments:confirmed', { roundType });
    } catch {}

    res.json({ success: true, data: { confirmed: true, totalAssigned } });
  } catch (error: any) {
    console.error('confirmAssignments ERROR:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// GET /drives/:driveId/rooms/:roundType/assignments
export const getAssignments = async (req: Request, res: Response): Promise<void> => {
  try {
    const { driveId, roundType } = req.params;
    const rooms = await RoomModel.find({ driveId, round: roundType }).lean();

    const allStudentIds = rooms.flatMap(r => r.assignedStudents || []);
    const students = await ApplicationModel.find({ _id: { $in: allStudentIds } })
      .select('_id data.name data.fullName data.branch data.usn data.email status').lean();

    const studentMap = new Map(students.map(s => [s._id.toString(), s]));

    const enriched = rooms.map(r => ({
      ...r,
      assignedStudentDetails: (r.assignedStudents || []).map((id: any) => {
        const s = studentMap.get(id.toString());
        return s ? {
          _id: s._id,
          name: s.data?.fullName || s.data?.name,
          branch: s.data?.branch,
          usn: s.data?.usn,
          email: s.data?.email,
          status: s.status
        } : { _id: id, name: 'Unknown' };
      })
    }));

    res.json({ success: true, data: enriched });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// POST /drives/:driveId/rounds/:roundType/results — Upload pass list
export const uploadRoundResults = async (req: Request, res: Response): Promise<void> => {
  try {
    const { driveId, roundType } = req.params;

    if (!req.file) {
      res.status(400).json({ success: false, error: 'No file uploaded' });
      return;
    }

    // Parse XLSX
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet);

    // Normalize: find USN or Email column
    const passSet = new Set<string>();
    for (const row of rows) {
      const usn = (row.USN || row.usn || row.Usn || row['Roll No'] || row.rollno || '').toString().trim().toUpperCase();
      const email = (row.Email || row.email || row.EMAIL || '').toString().trim().toLowerCase();
      if (usn) passSet.add(usn);
      if (email) passSet.add(email);
    }

    // Get all students in this round (from rooms)
    const rooms = await RoomModel.find({ driveId, round: roundType }).lean();
    const allStudentIds = rooms.flatMap(r => r.assignedStudents || []);
    const students = await ApplicationModel.find({ _id: { $in: allStudentIds } });

    let passed = 0, failed = 0, notMatched = 0;

    for (const student of students) {
      const usn = (student.data?.usn || '').toString().toUpperCase();
      const email = (student.data?.email || '').toString().toLowerCase();

      if (passSet.has(usn) || passSet.has(email)) {
        student.status = `${roundType}_passed` as any;
        student.currentRound = roundType as any;
        await student.save();
        passed++;
      } else {
        student.status = `${roundType}_failed` as any;
        await student.save();
        failed++;
      }
    }

    notMatched = rows.length - passed;

    // Find next round
    const drive = await DriveModel.findById(driveId);
    const roundTypes = (drive?.rounds?.map(r => r.type) || []) as string[];
    const currentIdx = roundTypes.indexOf(roundType);
    const nextRound = currentIdx >= 0 && currentIdx < roundTypes.length - 1 ? roundTypes[currentIdx + 1] : null;

    try {
      getIO().to(`drive:${driveId}`).emit('round:results_uploaded', { roundType, passed, failed });
    } catch {}

    res.json({
      success: true,
      data: { passed, failed, notMatched: Math.max(0, notMatched), nextRound }
    });
  } catch (error: any) {
    console.error('uploadRoundResults ERROR:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// GET /drives/:driveId/rounds/:roundType/students
export const getRoundStudents = async (req: Request, res: Response): Promise<void> => {
  try {
    const { driveId, roundType } = req.params;
    const rooms = await RoomModel.find({ driveId, round: roundType }).lean();
    const allStudentIds = rooms.flatMap(r => r.assignedStudents || []);

    const students = await ApplicationModel.find({ _id: { $in: allStudentIds } })
      .select('_id data.name data.fullName data.branch data.usn data.email status currentRound')
      .lean();

    res.json({ success: true, data: students });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// GET /drives/:driveId/rounds/:roundType/export — Stream XLSX
export const exportRoundStudents = async (req: Request, res: Response): Promise<void> => {
  try {
    const { driveId, roundType } = req.params;
    const rooms = await RoomModel.find({ driveId, round: roundType }).lean();
    const allStudentIds = rooms.flatMap(r => r.assignedStudents || []);

    const students = await ApplicationModel.find({ _id: { $in: allStudentIds } })
      .select('data status currentRound').lean();

    const rows = students.map(s => ({
      Name: s.data?.fullName || s.data?.name || '',
      USN: s.data?.usn || '',
      Email: s.data?.email || '',
      Branch: s.data?.branch || '',
      Status: s.status,
      Round: s.currentRound || roundType
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Students');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=round_${roundType}_students.xlsx`);
    res.send(buf);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// POST /drives/:driveId/final-selection — Upload final selected list
export const finalSelection = async (req: Request, res: Response): Promise<void> => {
  try {
    const { driveId } = req.params;

    if (!req.file) {
      res.status(400).json({ success: false, error: 'No file uploaded' });
      return;
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet);

    const drive = await DriveModel.findById(driveId);
    if (!drive) { res.status(404).json({ success: false, error: 'Drive not found' }); return; }

    let selected = 0, notFound = 0;

    for (const row of rows) {
      const email = (row.Email || row.email || row.EMAIL || '').toString().trim().toLowerCase();
      const usn = (row.USN || row.usn || row.Usn || '').toString().trim().toUpperCase();

      const app = await ApplicationModel.findOne({
        driveId,
        $or: [
          { 'data.email': email },
          { 'data.usn': usn }
        ]
      });

      if (app) {
        app.status = 'selected' as any;
        await app.save();
        selected++;

        // Emit Socket.io to student's personal room
        try {
          getIO().to(`app:${app._id}`).emit('student:selected', {
            applicationId: app._id.toString(),
            companyName: drive.companyName,
            jobRole: drive.jobRole
          });
        } catch {}
      } else {
        notFound++;
      }
    }

    res.json({ success: true, data: { selected, notFound } });
  } catch (error: any) {
    console.error('finalSelection ERROR:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// GET /drives/:driveId/selected
export const getSelectedStudents = async (req: Request, res: Response): Promise<void> => {
  try {
    const students = await ApplicationModel.find({
      driveId: req.params.driveId,
      status: 'selected'
    }).select('data status').lean();

    res.json({ success: true, data: students });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
