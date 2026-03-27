import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { DriveModel, FormFieldModel, ApplicationModel } from '../models';
import { getGridFSBucket } from '../services/gridfs.service';
import { generateUniqueDriveId } from '../utils/generate-drive-id';
import { sendDriveIdEmail } from '../services/email.service';
import mongoose from 'mongoose';
import { env } from '../config/env';
import crypto from 'crypto';
import path from 'path';

import { Readable } from 'stream';

const uploadToGridFS = (file: Express.Multer.File): Promise<mongoose.Types.ObjectId> => {
  return new Promise((resolve, reject) => {
    const bucket = getGridFSBucket();
    crypto.randomBytes(16, (err, buf) => {
      if (err) return reject(err);
      const filename = buf.toString('hex') + path.extname(file.originalname);
      const uploadStream = bucket.openUploadStream(filename, {
        contentType: file.mimetype
      });
      uploadStream.on('error', reject);
      uploadStream.on('finish', () => resolve(uploadStream.id as mongoose.Types.ObjectId));
      
      const readable = new Readable();
      readable.push(file.buffer);
      readable.push(null);
      readable.pipe(uploadStream);
    });
  });
};

export const upsertFormFields = async (req: Request, res: Response) => {
  try {
// ...
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
      formOpenDate: drive.formOpenDate,
      formCloseDate: drive.formCloseDate,
      formStatus: drive.formStatus,
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
    if (!drive) {
      return res.status(404).json({ success: false, error: 'Form not found' });
    }

    // Check form status — allow submissions as long as the form is open,
    // regardless of drive lifecycle stage (active, event_day, etc.)
    if (drive.formStatus === 'not_configured') {
      return res.status(403).json({ success: false, error: 'This form is not yet open for applications.' });
    }
    if (drive.formStatus === 'closed') {
      return res.status(403).json({ success: false, error: 'This form has been closed. Applications are no longer being accepted.' });
    }

    const now = new Date();
    if (drive.formCloseDate && now > new Date(drive.formCloseDate)) {
      await DriveModel.findByIdAndUpdate(drive._id, { formStatus: 'closed' });
      return res.status(403).json({ success: false, error: `Applications closed on ${new Date(drive.formCloseDate).toLocaleDateString()}. This form is no longer accepting submissions.` });
    }
    if (drive.formOpenDate && now < new Date(drive.formOpenDate)) {
      return res.status(403).json({ success: false, error: `This form opens on ${new Date(drive.formOpenDate).toLocaleDateString()}. Check back then!` });
    }

    const emailKey = Object.keys(req.body).find(k => k.toLowerCase().includes('email'));
    const emailValue = emailKey ? req.body[emailKey] : null;

    if (emailValue) {
      const existing = await ApplicationModel.findOne({ driveId: drive._id, [`data.${emailKey}`]: emailValue });
      if (existing) {
        return res.status(409).json({ success: false, error: 'You have already applied for this drive', referenceNumber: existing.referenceNumber });
      }
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    console.log('[submitApplication] files received:', Object.keys(files || {}));

    const resumeFile = files?.['resume']?.[0];
    const photoFile = files?.['photo']?.[0];

    let resumeFileId = null;
    let photoFileId = null;

    if (resumeFile) {
      resumeFileId = await uploadToGridFS(resumeFile);
    }
    if (photoFile) {
      photoFileId = await uploadToGridFS(photoFile);
    }
    console.log('[submitApplication] extracted IDs:', { resumeFileId, photoFileId });

    const currentYear = new Date().getFullYear();
    const randomNum = Math.floor(10000 + Math.random() * 90000); 
    const referenceNumber = `CP-${currentYear}-${randomNum}`;

    // Generate unique Drive Student ID
    const driveStudentId = await generateUniqueDriveId(drive.companyName);

    const appData = { ...req.body };
    delete appData.resume;
    delete appData.photo;

    const keys = Object.keys(appData);
    
    // Normalize core fields to ensure schema indices and frontend table rendering work perfectly
    const finalEmailKey = keys.find(k => k.toLowerCase().includes('email'));
    if (finalEmailKey && finalEmailKey !== 'email') { appData.email = appData[finalEmailKey]; delete appData[finalEmailKey]; }

    const usnKey = keys.find(k => k.toLowerCase().includes('usn') || k.toLowerCase().includes('roll'));
    if (usnKey && usnKey !== 'usn') { appData.usn = appData[usnKey]; delete appData[usnKey]; }

    const nameKey = keys.find(k => k.toLowerCase().includes('name'));
    if (nameKey && nameKey !== 'fullName') { appData.fullName = appData[nameKey]; delete appData[nameKey]; }

    const branchKey = keys.find(k => k.toLowerCase().includes('branch') || k.toLowerCase().includes('department'));
    if (branchKey && branchKey !== 'branch') { appData.branch = appData[branchKey]; delete appData[branchKey]; }

    const cgpaKey = keys.find(k => k.toLowerCase().includes('cgpa') || k.toLowerCase().includes('gpa'));
    if (cgpaKey && cgpaKey !== 'cgpa') { appData.cgpa = appData[cgpaKey]; delete appData[cgpaKey]; }

    const application = await ApplicationModel.create({
      referenceNumber,
      driveStudentId,
      driveId: drive._id,
      collegeId: drive.collegeId,
      data: appData,
      resumeFileId,
      photoFileId,
      status: 'applied',
      submittedAt: new Date()
    });

    // Send Drive ID confirmation email (fire & forget)
    const studentEmail = appData.email || appData.Email;
    const studentName = appData.fullName || appData.name || 'Student';
    if (studentEmail) {
      sendDriveIdEmail(
        studentEmail,
        studentName,
        driveStudentId,
        drive.companyName,
        drive.jobRole,
        drive.eventDate || null,
        (drive.collegeId || '').toString()
      ).catch((err: any) => console.error('Drive ID email failed:', err));
    }

    return res.status(201).json({ success: true, data: { referenceNumber, driveStudentId, message: 'Application submitted' } });
  } catch (error: unknown) {
    console.error('[submitApplication] Error:', error);
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
