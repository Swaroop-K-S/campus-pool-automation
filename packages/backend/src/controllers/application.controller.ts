import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { ApplicationModel } from '../models';

export const getApplications = async (req: Request, res: Response) => {
  try {
    const { driveId } = req.params;
    const collegeId = req.user?.collegeId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const status = req.query.status as string;

    const query: any = { driveId, collegeId };
    if (status) {
      query.status = status;
    }

    const applications = await ApplicationModel.find(query)
      .sort({ submittedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await ApplicationModel.countDocuments(query);

    return res.json({ success: true, data: { applications, total, page } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ success: false, error: message });
  }
};

export const getApplicationById = async (req: Request, res: Response) => {
  try {
    const { driveId, appId } = req.params;
    const collegeId = req.user?.collegeId;

    const application = await ApplicationModel.findOne({ _id: appId, driveId, collegeId });
    if (!application) {
      return res.status(404).json({ success: false, error: 'Application not found' });
    }

    return res.json({ success: true, data: application });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ success: false, error: message });
  }
};

export const getApplicationStats = async (req: Request, res: Response) => {
  try {
    const { driveId } = req.params;
    const collegeId = req.user?.collegeId;

    const objectIdDriveId = mongoose.Types.ObjectId.isValid(driveId) ? new mongoose.Types.ObjectId(driveId) : driveId;
    
    const validStats = await ApplicationModel.aggregate([
      { $match: { driveId: objectIdDriveId, collegeId } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const result = {
      total: 0,
      applied: 0,
      shortlisted: 0,
      attended: 0,
      selected: 0
    };

    validStats.forEach(stat => {
      result.total += stat.count;
      switch (stat._id) {
        case 'applied': result.applied = stat.count; break;
        case 'shortlisted': result.shortlisted = stat.count; break;
        case 'attended': result.attended = stat.count; break;
        case 'selected': result.selected = stat.count; break;
      }
    });

    return res.json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ success: false, error: message });
  }
};
