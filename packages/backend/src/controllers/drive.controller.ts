import { Request, Response } from 'express';
import { DriveModel, ApplicationModel, FormFieldModel } from '../models';
import mongoose from 'mongoose';
import { asyncHandler } from '../utils/async-handler';
import { DriveStatusEnum } from '@campuspool/shared';

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
      branches: req.body.eligibilityCriteria?.allowedBranches || []
    },
    rounds: [],
  });

  // Seed default form fields for the new drive
  await FormFieldModel.create({
    driveId: newDrive._id,
    collegeId,
    fields: [
      { id: 'field_name', type: 'text', label: 'Full Name', required: true, locked: true, order: 0 },
      { id: 'field_usn', type: 'text', label: 'USN', required: true, locked: true, order: 1, validation: { pattern: '^[1-9][A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{3}$', customErrorMessage: 'Must be a valid USN (e.g., 1RV22CS111)' } },
      { id: 'field_email', type: 'email', label: 'Email Address', required: true, locked: true, order: 2, validation: { pattern: '^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$', customErrorMessage: 'Valid email required' } },
      { id: 'field_phone', type: 'phone', label: 'Phone Number', required: true, locked: true, order: 3, validation: { pattern: '^\\d{10}$', customErrorMessage: 'Must be exactly 10 digits' } },
      { id: 'field_branch', type: 'dropdown', label: 'Branch', required: true, locked: true, order: 4, options: ['CSE', 'CSE (AIML)', 'CSE (Data Science)', 'ISE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'OTHER'] },
      { id: 'field_cgpa', type: 'number', label: 'CGPA', required: true, locked: true, order: 5, validation: { min: 0, max: 10, customErrorMessage: 'CGPA must be between 0 and 10' } },
    ]
  });

  res.status(201).json({
    success: true,
    data: newDrive
  });
});

// GET /api/v1/drives/:driveId
export const getDriveById = asyncHandler(async (req: Request, res: Response) => {
  const driveId = req.params.driveId;
  const collegeId = (req as any).user.collegeId;

  const drive = await DriveModel.findOne({ _id: driveId, collegeId });
  
  if (!drive) {
    return res.status(404).json({ success: false, error: 'Drive not found' });
  }

  res.status(200).json({ success: true, data: drive });
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

// DELETE /api/v1/drives/:driveId
export const deleteDrive = asyncHandler(async (req: Request, res: Response) => {
  const driveId = req.params.driveId;
  const collegeId = (req as any).user.collegeId;

  const drive = await DriveModel.findOne({ _id: driveId, collegeId });
  if (!drive) return res.status(404).json({ success: false, error: 'Drive not found' });

  await Promise.all([
    DriveModel.findByIdAndDelete(driveId),
    ApplicationModel.deleteMany({ driveId })
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
