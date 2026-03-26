import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { ApplicationModel } from '../models';
import { FormFieldModel } from '../models/form-field.model';

export const getApplications = async (req: Request, res: Response) => {
  try {
    const { driveId } = req.params;
    const collegeId = req.user?.collegeId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const status = req.query.status as string;

    const query: any = { driveId, collegeId };
    if (status && status !== 'all') {
      query.status = status;
    }

    // Get form fields for this drive (to know what columns to show)
    const formConfig = await FormFieldModel.findOne({ driveId }).lean();

    const total = await ApplicationModel.countDocuments(query);

    const applications = await ApplicationModel.find(query)
      .sort({ submittedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Add hasResume and hasPhoto flags
    const enriched = applications.map((app: any) => ({
      ...app,
      hasResume: !!app.resumeFileId,
      hasPhoto: !!app.photoFileId,
      photoUrl: app.photoFileId
        ? `/api/v1/drives/${driveId}/applications/${app._id}/photo`
        : null,
    }));

    return res.json({
      success: true,
      data: {
        applications: enriched,
        formFields: formConfig?.fields || [],
        total,
        page,
        totalPages: Math.ceil(total / limit)
      }
    });
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

export const updateApplicationStatus = async (req: Request, res: Response) => {
  try {
    const { driveId, appId } = req.params;
    const collegeId = req.user?.collegeId;
    const { status } = req.body;

    if (!status || !['applied', 'shortlisted', 'attended', 'selected', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    const application = await ApplicationModel.findOneAndUpdate(
      { _id: appId, driveId, collegeId },
      { status },
      { new: true }
    );

    if (!application) {
      return res.status(404).json({ success: false, error: 'Application not found' });
    }

    return res.json({ success: true, data: application });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ success: false, error: message });
  }
};

export const updateApplicationData = async (req: Request, res: Response) => {
  try {
    const { driveId, appId } = req.params;
    const collegeId = req.user?.collegeId;
    const { data } = req.body;

    if (!data) {
      return res.status(400).json({ success: false, error: 'No data provided to update' });
    }

    const application = await ApplicationModel.findOneAndUpdate(
      { _id: appId, driveId, collegeId },
      { $set: { data } },
      { new: true }
    );

    if (!application) {
      return res.status(404).json({ success: false, error: 'Application not found' });
    }

    return res.json({ success: true, data: application });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ success: false, error: message });
  }
};

export const addManualCandidate = async (req: Request, res: Response) => {
  try {
    const { driveId } = req.params;
    const collegeId = req.user?.collegeId;
    const { data } = req.body;

    if (!data) {
      return res.status(400).json({ success: false, error: 'Candidate data is required' });
    }

    const application = new ApplicationModel({
      driveId,
      collegeId,
      data,
      status: 'shortlisted',
      referenceNumber: `MAN-${Date.now().toString().slice(-6)}`,
      submittedAt: new Date()
    });

    await application.save();

    return res.status(201).json({ success: true, data: application });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ success: false, error: message });
  }
};
