import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { DriveModel, FormFieldModel, ApplicationModel } from '../models';
import { getGridFSBucket } from '../services/gridfs.service';
import mongoose from 'mongoose';
import { env } from '../config/env';

export const upsertFormFields = async (req: Request, res: Response) => {
  try {
    const { driveId } = req.params;
    const { fields } = req.body;
    const collegeId = req.user?.collegeId;

    const drive = await DriveModel.findOne({ _id: driveId, collegeId });
    if (!drive) return res.status(404).json({ success: false, error: 'Drive not found' });

    let formToken = drive.formToken;
    if (!formToken) {
      formToken = Buffer.from(uuidv4()).toString('base64url');
      drive.formToken = formToken;
      await drive.save();
    }

    await FormFieldModel.findOneAndUpdate(
      { driveId },
      { driveId, collegeId, fields },
      { upsert: true, new: true }
    );

    const publicUrl = `${env.FRONTEND_URL}/apply/${formToken}`;
    return res.json({ success: true, data: { formToken, publicUrl } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ success: false, error: message });
  }
};

export const getFormFields = async (req: Request, res: Response) => {
  try {
    const { driveId } = req.params;
    const formConfig = await FormFieldModel.findOne({ driveId, collegeId: req.user?.collegeId });
    return res.json({ success: true, data: formConfig?.fields || [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ success: false, error: message });
  }
};

export const getPublicFormConfig = async (req: Request, res: Response) => {
  try {
    const { formToken } = req.params;
    const drive = await DriveModel.findOne({ formToken });
    if (!drive) return res.status(404).json({ success: false, error: 'Form not found' });

    const formConfig = await FormFieldModel.findOne({ driveId: drive._id });
    
    return res.json({ success: true, data: {
      driveId: drive._id,
      companyName: drive.companyName,
      jobRole: drive.jobRole,
      eventDate: drive.eventDate,
      locations: drive.locations,
      ctc: drive.ctc,
      status: drive.status,
      fields: formConfig?.fields || []
    }});
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ success: false, error: message });
  }
};

export const submitApplication = async (req: Request, res: Response) => {
  try {
    const { formToken } = req.params;
    const drive = await DriveModel.findOne({ formToken });
    if (!drive || drive.status !== 'active') {
      return res.status(403).json({ success: false, error: 'Form is inactive' });
    }

    const { email } = req.body;
    const existing = await ApplicationModel.findOne({ driveId: drive._id, 'data.email': email });
    if (existing) {
      return res.status(409).json({ success: false, error: 'You have already applied for this drive', referenceNumber: existing.referenceNumber });
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const resumeFile = files?.['resume']?.[0];
    const photoFile = files?.['photo']?.[0];

    const resumeFileId = resumeFile ? (resumeFile as any).id : null;
    const photoFileId = photoFile ? (photoFile as any).id : null;

    const currentYear = new Date().getFullYear();
    const randomNum = Math.floor(10000 + Math.random() * 90000); 
    const referenceNumber = `CP-${currentYear}-${randomNum}`;

    const appData = { ...req.body };
    delete appData.resume;
    delete appData.photo;

    await ApplicationModel.create({
      referenceNumber,
      driveId: drive._id,
      collegeId: drive.collegeId,
      data: appData,
      resumeFileId,
      photoFileId,
      status: 'applied',
      submittedAt: new Date()
    });

    return res.status(201).json({ success: true, data: { referenceNumber, message: 'Application submitted' } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ success: false, error: message });
  }
};

export const streamResume = async (req: Request, res: Response) => {
  try {
    const { appId } = req.params;
    const application = await ApplicationModel.findOne({ _id: appId, collegeId: req.user?.collegeId });
    if (!application || !application.resumeFileId) return res.status(404).send('Not found');

    const bucket = getGridFSBucket();
    const fileId = new mongoose.Types.ObjectId(application.resumeFileId.toString());
    
    res.set('Content-Type', 'application/pdf');
    bucket.openDownloadStream(fileId).pipe(res)
      .on('error', () => res.status(500).send('File stream error'));
  } catch (error: unknown) {
    res.status(500).send('Error');
  }
};

export const streamPhoto = async (req: Request, res: Response) => {
  try {
    const { appId } = req.params;
    const application = await ApplicationModel.findOne({ _id: appId, collegeId: req.user?.collegeId });
    if (!application || !application.photoFileId) return res.status(404).send('Not found');

    const bucket = getGridFSBucket();
    const fileId = new mongoose.Types.ObjectId(application.photoFileId.toString());
    
    res.set('Content-Type', 'image/jpeg');
    bucket.openDownloadStream(fileId).pipe(res)
      .on('error', () => res.status(500).send('File stream error'));
  } catch (error: unknown) {
    res.status(500).send('Error');
  }
};
