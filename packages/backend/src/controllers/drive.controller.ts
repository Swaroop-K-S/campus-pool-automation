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
    name: req.body.companyName || 'Draft Drive',
    companyDetails: {
      name: req.body.companyName,
      website: req.body.website || 'https://example.com',
      industry: 'Technology',
      logoUrl: ''
    },
    jobRole: req.body.jobRole,
    ctc: {
      currency: 'INR',
      amount: parseInt(req.body.ctc) || 0,
      isHidden: false
    },
    locations: req.body.locations ? req.body.locations.split(',').map((l: string) => l.trim()) : [],
    description: req.body.description,
    status: DriveStatusEnum.enum.draft,
    eligibilityCriteria: {
      minCgpa: 0,
      allowedBranches: [],
      maxBacklogs: 0
    },
    rounds: [],
    dates: {
      registrationStart: new Date(),
      registrationEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // +7 days
    }
  });

  res.status(201).json({
    success: true,
    data: newDrive
  });
});
