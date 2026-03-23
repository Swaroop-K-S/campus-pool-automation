import { Request, Response } from 'express';
import { CollegeModel } from '../models';
import { asyncHandler } from '../utils/async-handler';

// GET /api/v1/platform/colleges
export const getColleges = asyncHandler(async (req: Request, res: Response) => {
  const colleges = await CollegeModel.find().sort({ createdAt: -1 });
  res.status(200).json({ success: true, data: colleges });
});

// POST /api/v1/platform/colleges
export const createCollege = asyncHandler(async (req: Request, res: Response) => {
  const { name, address } = req.body;

  const college = await CollegeModel.create({
    name,
    address,
    isActive: true
  });

  res.status(201).json({ success: true, data: college });
});
