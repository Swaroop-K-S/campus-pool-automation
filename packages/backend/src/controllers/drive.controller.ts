import { Request, Response } from 'express';
import { DriveModel } from '../models';
import { asyncHandler } from '../utils/async-handler';
import { DriveStatusEnum } from '@campuspool/shared';

// GET /api/v1/drives
export const getDrives = asyncHandler(async (req: Request, res: Response) => {
  const collegeId = (req as any).user.collegeId;
  
  // Sort by most recent
  const drives = await DriveModel.find({ collegeId }).sort({ createdAt: -1 });

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
