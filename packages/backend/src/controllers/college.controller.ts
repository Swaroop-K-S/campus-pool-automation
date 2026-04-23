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

// GET /api/v1/college/templates
export const getTemplates = asyncHandler(async (req: Request, res: Response) => {
  const collegeId = (req as any).user.collegeId;
  const college = await CollegeModel.findById(collegeId).select('driveTemplates');
  res.json({ success: true, data: (college as any)?.driveTemplates || [] });
});

// POST /api/v1/college/templates — save a drive as a template
export const saveTemplate = asyncHandler(async (req: Request, res: Response) => {
  const collegeId = (req as any).user.collegeId;
  const { name, companyName, jobRole, ctc, locations, eligibility, rounds, scorecardTraits, resources } = req.body;
  if (!name?.trim()) return res.status(400).json({ success: false, error: 'Template name is required' });

  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const template = { id, name: name.trim(), companyName, jobRole, ctc, locations, eligibility, rounds, scorecardTraits, resources, createdAt: new Date() };

  await CollegeModel.findByIdAndUpdate(collegeId, { $push: { driveTemplates: template } });
  res.json({ success: true, data: template });
});

// DELETE /api/v1/college/templates/:templateId
export const deleteTemplate = asyncHandler(async (req: Request, res: Response) => {
  const collegeId = (req as any).user.collegeId;
  const { templateId } = req.params;
  await CollegeModel.findByIdAndUpdate(collegeId, { $pull: { driveTemplates: { id: templateId } } });
  res.json({ success: true, data: { id: templateId } });
});
