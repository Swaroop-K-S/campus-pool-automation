import { Request, Response } from 'express';
import { DriveModel, ApplicationModel, FormFieldModel, RoomModel } from '../models';
import mongoose from 'mongoose';
import { asyncHandler } from '../utils/async-handler';
import { DriveStatusEnum } from '@campuspool/shared';
import { AppCache, generateCacheKey } from '../utils/cache';

// GET /api/v1/drives
export const getDrives = asyncHandler(async (req: Request, res: Response) => {
  const collegeId = (req as any).user.collegeId;
  const includeCount = req.query.includeCount === 'true';
  
  // Sort by most recent
  let drives = await DriveModel.find({ collegeId }).sort({ createdAt: -1 }).lean();

  if (includeCount) {
    const counts = await ApplicationModel.aggregate([
      { $match: { collegeId: new mongoose.Types.ObjectId(collegeId) } },
      { $group: { 
        _id: { driveId: '$driveId', status: '$status' },
        count: { $sum: 1 }
      }}
    ]);

    drives = drives.map(drive => {
      const driveCounts = counts.filter(c => c._id.driveId?.toString() === drive._id.toString());
      const applicationCount = driveCounts.reduce((acc, curr) => acc + curr.count, 0);
      const shortlistedCount = driveCounts.find(c => c._id.status === 'shortlisted')?.count || 0;
      const selectedCount = driveCounts.find(c => c._id.status === 'selected')?.count || 0;
      
      return { ...drive, applicationCount, shortlistedCount, selectedCount };
    });
  }

  res.status(200).json({
    success: true,
    data: drives
  });
});

// POST /api/v1/drives
export const createDrive = asyncHandler(async (req: Request, res: Response) => {
  const collegeId = (req as any).user.collegeId;
  
  // Create a new drive from the New Drive Wizard step 1 payload plus defaults
  const newDrive = await DriveModel.create({
    collegeId,
    companyName: req.body.companyName || 'Draft Drive',
    jobRole: req.body.jobRole,
    ctc: req.body.ctc || 'Not Disclosed',
    locations: req.body.locations ? req.body.locations.split(',').map((l: string) => l.trim()) : [],
    description: req.body.description,
    status: DriveStatusEnum.enum.draft,
    eligibility: {
      minCGPA: req.body.eligibilityCriteria?.minCgpa || 0,
      branches: req.body.eligibilityCriteria?.allowedBranches || [],
      tenth: req.body.eligibilityCriteria?.tenth || { required: false, minPercentage: 0 },
      twelfth: req.body.eligibilityCriteria?.twelfth || { required: false, minPercentage: 0 },
      diploma: req.body.eligibilityCriteria?.diploma || { required: false, minCGPA: 0 }
    },
    rounds: req.body.rounds || [],
    tags: req.body.tags || [],
    eventDate: req.body.eventDate || null,
    reportTime: req.body.reportTime || null,
    venueDetails: req.body.venueDetails || null
  });

  // Seed default form fields for the new drive
  await FormFieldModel.create({
    driveId: newDrive._id,
    collegeId,
    fields: [
      { id: 'field_name', type: 'text', label: 'Full Name', required: true, locked: true, order: 0 },
      { id: 'field_usn', type: 'text', label: 'USN', required: true, locked: true, order: 1, validation: { pattern: '^[A-Za-z0-9]{5,20}$', customErrorMessage: 'Must be a valid alphanumeric USN/Roll No' } },
      { id: 'field_email', type: 'email', label: 'Email Address', required: true, locked: true, order: 2, validation: { pattern: '^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$', customErrorMessage: 'Valid email required' } },
      { id: 'field_phone', type: 'phone', label: 'Phone Number', required: true, locked: true, order: 3, validation: { pattern: '^\\d{10}$', customErrorMessage: 'Must be exactly 10 digits' } },
      { id: 'field_gender', type: 'dropdown', label: 'Gender', required: true, locked: true, order: 4, options: ['Male', 'Female', 'Other'] },
      { id: 'field_branch', type: 'dropdown', label: 'Branch', required: true, locked: true, order: 5, options: ['CSE', 'CSE (AIML)', 'CSE (Data Science)', 'ISE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'OTHER'] },
      { id: 'field_cgpa', type: 'number', label: 'CGPA', required: true, locked: true, order: 6, validation: { min: 0, max: 10, customErrorMessage: 'CGPA must be between 0 and 10' } },
    ]
  });

  // Automatically create a Room if venue details are provided
  if (req.body.venueDetails && req.body.venueDetails.hallName) {
    const initialRoundType = (req.body.rounds && req.body.rounds.length > 0) ? req.body.rounds[0].type : 'ppt';
    await RoomModel.create({
      driveId: newDrive._id,
      collegeId,
      round: initialRoundType,
      name: req.body.venueDetails.hallName,
      floor: 'Ground', // Default value
      capacity: req.body.venueDetails.capacity || 100,
      panelists: []
    });
  }

  res.status(201).json({
    success: true,
    data: newDrive
  });
});

// GET /api/v1/drives/:driveId
export const getDriveById = asyncHandler(async (req: Request, res: Response) => {
  const driveId = req.params.driveId;
  const collegeId = (req as any).user.collegeId;

  const cacheKey = generateCacheKey('drive-by-id', { driveId, collegeId });
  const cachedData = AppCache.get(cacheKey);
  if (cachedData) {
    return res.status(200).json({ success: true, data: cachedData, cached: true });
  }

  const drive = await DriveModel.findOne({ _id: driveId, collegeId }).lean();
  
  if (!drive) {
    return res.status(404).json({ success: false, error: 'Drive not found' });
  }

  AppCache.set(cacheKey, drive);
  res.status(200).json({ success: true, data: drive, cached: false });
});

// PUT /api/v1/drives/:driveId
export const updateDrive = asyncHandler(async (req: Request, res: Response) => {
  const driveId = req.params.driveId;
  const collegeId = (req as any).user.collegeId;

  const updatedDrive = await DriveModel.findOneAndUpdate(
    { _id: driveId, collegeId },
    req.body,
    { new: true, runValidators: true }
  );

  if (!updatedDrive) {
    return res.status(404).json({ success: false, error: 'Drive not found' });
  }

  res.status(200).json({ success: true, data: updatedDrive });
});

// PATCH /api/v1/drives/:driveId/activate
export const activateDrive = asyncHandler(async (req: Request, res: Response) => {
  const driveId = req.params.driveId;
  const collegeId = (req as any).user.collegeId;

  const initialDrive = await DriveModel.findOne({ _id: driveId, collegeId });
  if (!initialDrive) {
    return res.status(404).json({ success: false, error: 'Drive not found' });
  }
  
  initialDrive.status = DriveStatusEnum.enum.active;
  await initialDrive.save();

  res.status(200).json({ success: true, data: initialDrive });
});

// PATCH /api/v1/drives/:driveId/form/schedule
export const scheduleForm = asyncHandler(async (req: Request, res: Response) => {
  const driveId = req.params.driveId;
  const collegeId = (req as any).user.collegeId;
  const { formOpenDate, formCloseDate } = req.body;

  const now = new Date();
  let formStatus = 'scheduled';
  if (new Date(formOpenDate) <= now) {
    formStatus = 'open';
  }

  const updatedDrive = await DriveModel.findOneAndUpdate(
    { _id: driveId, collegeId },
    { formOpenDate, formCloseDate, formStatus },
    { new: true }
  );

  if (!updatedDrive) return res.status(404).json({ success: false, error: 'Drive not found' });
  res.status(200).json({ success: true, data: updatedDrive });
});

// PATCH /api/v1/drives/:driveId/form/extend
export const extendForm = asyncHandler(async (req: Request, res: Response) => {
  const driveId = req.params.driveId;
  const collegeId = (req as any).user.collegeId;
  const { newCloseDate, reason } = req.body;

  const drive = await DriveModel.findOne({ _id: driveId, collegeId });
  if (!drive) return res.status(404).json({ success: false, error: 'Drive not found' });

  if (!drive.formExtensions) {
    drive.formExtensions = [];
  }

  drive.formExtensions.push({
    extendedBy: (req as any).user.email,
    previousCloseDate: drive.formCloseDate || null,
    newCloseDate: new Date(newCloseDate),
    reason: reason || 'Extended by admin',
    extendedAt: new Date()
  });

  drive.formCloseDate = new Date(newCloseDate);
  drive.formStatus = 'extended';
  
  await drive.save();
  res.status(200).json({ success: true, data: drive });
});

// PATCH /api/v1/drives/:driveId/form/close
export const closeForm = asyncHandler(async (req: Request, res: Response) => {
  const driveId = req.params.driveId;
  const collegeId = (req as any).user.collegeId;

  const updatedDrive = await DriveModel.findOneAndUpdate(
    { _id: driveId, collegeId },
    { formStatus: 'closed', formCloseDate: new Date() },
    { new: true }
  );

  if (!updatedDrive) return res.status(404).json({ success: false, error: 'Drive not found' });
  res.status(200).json({ success: true, data: updatedDrive });
});

// PATCH /api/v1/drives/:driveId/form/reopen
export const reopenForm = asyncHandler(async (req: Request, res: Response) => {
  const driveId = req.params.driveId;
  const collegeId = (req as any).user.collegeId;
  const { newCloseDate } = req.body;

  const updatedDrive = await DriveModel.findOneAndUpdate(
    { _id: driveId, collegeId },
    { formStatus: 'open', formCloseDate: new Date(newCloseDate) },
    { new: true }
  );

  if (!updatedDrive) return res.status(404).json({ success: false, error: 'Drive not found' });
  res.status(200).json({ success: true, data: updatedDrive });
});

import { NotificationModel } from '../models/notification.model';

// DELETE /api/v1/drives/:driveId
export const deleteDrive = asyncHandler(async (req: Request, res: Response) => {
  const driveId = req.params.driveId;
  const collegeId = (req as any).user.collegeId;

  const drive = await DriveModel.findOne({ _id: driveId, collegeId });
  if (!drive) return res.status(404).json({ success: false, error: 'Drive not found' });

  await Promise.all([
    DriveModel.findByIdAndDelete(driveId),
    ApplicationModel.deleteMany({ driveId }),
    FormFieldModel.deleteMany({ driveId }),
    RoomModel.deleteMany({ driveId }),
    NotificationModel.deleteMany({ driveId })
  ]);

  res.status(200).json({ success: true, data: {} });
});

// PATCH /api/v1/drives/:driveId/start-event
export const startEventDay = asyncHandler(async (req: Request, res: Response) => {
  const driveId = req.params.driveId;
  const collegeId = (req as any).user.collegeId;

  const drive = await DriveModel.findOneAndUpdate(
    { _id: driveId, collegeId },
    { status: 'event_day' },
    { new: true }
  );

  if (!drive) return res.status(404).json({ success: false, error: 'Drive not found' });
  res.status(200).json({ success: true, data: drive });
});

// PATCH /api/v1/drives/:driveId/complete
export const markCompleted = asyncHandler(async (req: Request, res: Response) => {
  const driveId = req.params.driveId;
  const collegeId = (req as any).user.collegeId;

  const drive = await DriveModel.findOneAndUpdate(
    { _id: driveId, collegeId },
    { status: 'completed' },
    { new: true }
  );

  if (!drive) return res.status(404).json({ success: false, error: 'Drive not found' });
  res.status(200).json({ success: true, data: drive });
});

// GET /api/v1/drives/:driveId/archive
// 1-Click Archive & Compliance Report
import exceljs from 'exceljs';

export const archiveDrive = asyncHandler(async (req: Request, res: Response) => {
  const driveId = req.params.driveId;
  const collegeId = (req as any).user.collegeId;

  const drive = await DriveModel.findOneAndUpdate(
    { _id: driveId, collegeId },
    { status: 'archived' },
    { new: true }
  );

  if (!drive) return res.status(404).json({ success: false, error: 'Drive not found' });

  const workbook = new exceljs.Workbook();
  const apps = await ApplicationModel.find({ driveId }).lean();
  const notifications = await NotificationModel.find({ driveId }).populate('applicationId', 'data candidateEmail referenceNumber').lean();

  // Sheet 1: All Applications
  const sheet1 = workbook.addWorksheet('All Applications');
  sheet1.columns = [
    { header: 'Ref#', key: 'ref', width: 20 },
    { header: 'Name', key: 'name', width: 25 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Email', key: 'email', width: 25 },
    { header: 'Phone', key: 'phone', width: 15 },
    { header: 'Applied At', key: 'date', width: 20 }
  ];
  sheet1.getRow(1).font = { bold: true };
  sheet1.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
  apps.forEach(app => {
    sheet1.addRow({
      ref: (app as any).referenceNumber || '-',
      name: app.data?.name || app.data?.fullName || '-',
      status: app.status,
      email: app.data?.email || (app as any).candidateEmail || '-',
      phone: app.data?.phone || '-',
      date: new Date((app as any).createdAt || Date.now()).toLocaleString()
    });
  });

  // Sheet 2: Shortlist & Selected
  const sheet2 = workbook.addWorksheet('Offers & Shortlists');
  sheet2.columns = [
    { header: 'Ref#', key: 'ref', width: 20 },
    { header: 'Name', key: 'name', width: 25 },
    { header: 'Final Status', key: 'status', width: 15 }
  ];
  sheet2.getRow(1).font = { bold: true };
  sheet2.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10B981' } };
  apps.filter(a => a.status === 'selected' || a.status === 'shortlisted').forEach(app => {
    sheet2.addRow({
      ref: (app as any).referenceNumber || '-',
      name: app.data?.name || app.data?.fullName || '-',
      status: app.status.toUpperCase()
    });
  });

  // Sheet 3: Communications Audit
  const sheet3 = workbook.addWorksheet('Audit Log');
  sheet3.columns = [
    { header: 'Date', key: 'date', width: 25 },
    { header: 'Candidate Ref', key: 'ref', width: 20 },
    { header: 'Channel', key: 'channel', width: 15 },
    { header: 'Type', key: 'type', width: 15 },
    { header: 'Delivery Status', key: 'status', width: 15 },
    { header: 'Error (if any)', key: 'error', width: 30 }
  ];
  sheet3.getRow(1).font = { bold: true };
  sheet3.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF59E0B' } };
  notifications.forEach(log => {
      sheet3.addRow({
          date: log.sentAt ? new Date(log.sentAt).toLocaleString() : '-',
          ref: (log.applicationId as any)?.referenceNumber || '-',
          channel: log.channel,
          type: log.recipientType,
          status: log.status,
          error: log.errorMessage || '-'
      });
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=${(drive?.companyName || 'Drive').replace(/\s+/g,'_')}_Compliance_Archive.xlsx`);

  await workbook.xlsx.write(res);
  res.end();
});

// POST /api/v1/drives/:driveId/clone
export const cloneDrive = asyncHandler(async (req: Request, res: Response) => {
  const { driveId } = req.params;
  const collegeId = (req as any).user.collegeId;

  // 1. Fetch the source drive
  const sourceDrive = await DriveModel.findOne({ _id: driveId, collegeId }).lean();
  if (!sourceDrive) {
    return res.status(404).json({ success: false, error: 'Source drive not found' });
  }

  // 2. Fetch the source form config
  const sourceForm = await FormFieldModel.findOne({ driveId }).lean();

  // 3. Build the cloned drive (strip IDs, dates, status)
  const clonedDriveData: any = {
    collegeId,
    companyName: `${sourceDrive.companyName} (Copy)`,
    jobRole: sourceDrive.jobRole,
    ctc: sourceDrive.ctc,
    locations: sourceDrive.locations || [],
    description: (sourceDrive as any).description,
    eligibility: sourceDrive.eligibility,
    rounds: (sourceDrive.rounds || []).map((r: any) => ({
      type: r.type,
      label: r.label,
      order: r.order,
      status: 'pending',
      isCustom: r.isCustom
    })),
    schedule: (sourceDrive.schedule || []).map((s: any) => ({
      roundType: s.roundType,
      startTime: s.startTime,
      duration: s.duration
    })),
    status: 'draft',
    formStatus: 'not_configured',
    tags: (sourceDrive as any).tags || [],
  };

  const newDrive = await DriveModel.create(clonedDriveData);

  // 4. Clone form fields if they exist
  if (sourceForm && sourceForm.fields) {
    await FormFieldModel.create({
      driveId: newDrive._id,
      collegeId,
      fields: sourceForm.fields.map((f: any) => ({
        ...f,
        id: f.id // keep same IDs for consistency
      }))
    });
  }

  res.status(201).json({ success: true, data: newDrive });
});
