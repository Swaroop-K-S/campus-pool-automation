import { Request, Response } from 'express';
import { CollegeModel } from '../models';
import { asyncHandler } from '../utils/async-handler';

// GET /api/v1/college/profile
export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const collegeId = (req as any).user.collegeId;
  const college = await CollegeModel.findById(collegeId);
  if (!college) {
    return res.status(404).json({ success: false, error: 'College not found' });
  }
  res.json({ success: true, data: college });
});

// PUT /api/v1/college/profile
export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const collegeId = (req as any).user.collegeId;
  // name, address, contactEmail, etc.
  const updateData = req.body;
  
  const college = await CollegeModel.findByIdAndUpdate(
    collegeId,
    { $set: updateData },
    { new: true }
  );

  res.json({ success: true, data: college });
});

// PUT /api/v1/college/smtp
export const updateSmtp = asyncHandler(async (req: Request, res: Response) => {
  const collegeId = (req as any).user.collegeId;
  const smtpConfig = req.body;
  
  const college = await CollegeModel.findByIdAndUpdate(
    collegeId,
    { $set: { smtpConfig } },
    { new: true }
  );

  res.json({ success: true, data: college });
});

// PUT /api/v1/college/twilio
export const updateTwilio = asyncHandler(async (req: Request, res: Response) => {
  const collegeId = (req as any).user.collegeId;
  const twilioConfig = req.body;
  
  const college = await CollegeModel.findByIdAndUpdate(
    collegeId,
    { $set: { twilioConfig } },
    { new: true }
  );

  res.json({ success: true, data: college });
});
