import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { DriveModel, ApplicationModel, FormFieldModel, RoomModel, StudentProfileModel, UserModel } from '../models';
import mongoose from 'mongoose';
import exceljs from 'exceljs';
import { asyncHandler } from '../utils/async-handler';
import { DriveService } from '../services/drive.service';
import { DriveStatusEnum } from '@campuspool/shared';
import { generateFinalCSV } from '../services/export.service';
import { enqueueMassEmail } from '../services/email.service';
import { enqueueAIMentorJob } from '../services/ai-mentor.service';
import { AppCache, generateCacheKey } from '../utils/cache';
import { logAuditEvent } from '../services/audit.service';
import { getIO } from '../socket';
import { startQRRotation } from '../socket/handlers/qr.handler';
import { NotificationModel } from '../models/notification.model';

// GET /api/v1/drives
export const getDrives = asyncHandler(async (req: Request, res: Response) => {
  const collegeId = (req as any).user.collegeId;
  const includeCount = req.query.includeCount === 'true';
  
  const drives = await DriveService.getDrivesWithCounts(collegeId, includeCount);

  res.status(200).json({
    success: true,
    data: drives
  });
});

// POST /api/v1/drives
export const createDrive = asyncHandler(async (req: Request, res: Response) => {
  const collegeId = (req as any).user.collegeId;
  
  const newDrive = await DriveService.createDrive(collegeId, req.body);

  await logAuditEvent({
    userId: (req as any).user.userId,
    action: 'CREATE_DRIVE',
    resourceType: 'Drive',
    resourceId: newDrive._id.toString(),
    details: `Created drive: ${newDrive.companyName}`,
    ipAddress: req.ip || req.socket.remoteAddress
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

  const cacheKey = generateCacheKey('drive-by-id', { driveId, collegeId });
  const cachedData = await AppCache.get(cacheKey);
  if (cachedData) {
    return res.status(200).json({ success: true, data: cachedData, cached: true });
  }

  const drive = await DriveService.getDriveById(driveId, collegeId);
  
  if (!drive) {
    return res.status(404).json({ success: false, error: 'Drive not found' });
  }

  await AppCache.set(cacheKey, drive);
  res.status(200).json({ success: true, data: drive, cached: false });
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

  // Invalidate cache so all tabs get fresh data
  try { await AppCache.del(generateCacheKey('drive-by-id', { driveId, collegeId })); } catch {}

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

  // Invalidate cache + broadcast live status change to dashboard
  try { await AppCache.del(generateCacheKey('drive-by-id', { driveId, collegeId })); } catch {}
  try {
    getIO().to(`drive:${driveId}`).emit('drive:status_changed', {
      driveId,
      status: 'active',
      companyName: initialDrive.companyName
    });
  } catch {}

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
    ApplicationModel.deleteMany({ driveId }),
    FormFieldModel.deleteMany({ driveId }),
    RoomModel.deleteMany({ driveId }),
    NotificationModel.deleteMany({ driveId }),
    UserModel.deleteMany({ driveId, role: 'company_hr' }) // Cascade delete assigned HR users
  ]);

  await logAuditEvent({
    userId: (req as any).user.userId,
    action: 'DELETE_DRIVE',
    resourceType: 'Drive',
    resourceId: driveId,
    details: `Deleted drive and all associated metadata.`,
    ipAddress: req.ip || req.socket.remoteAddress
  });

  res.status(200).json({ success: true, data: {} });
});

// PATCH /api/v1/drives/:driveId/start-event
export const startEventDay = asyncHandler(async (req: Request, res: Response) => {
  const driveId = req.params.driveId;
  const collegeId = (req as any).user.collegeId;

  // ─── API-Level Preflight Guard ─────────────────────────────────────────────
  // Even with the frontend modal, the API must independently verify readiness.
  const [roomCount, shortlistedCount] = await Promise.all([
    RoomModel.countDocuments({ driveId }),
    ApplicationModel.countDocuments({ driveId, status: 'shortlisted' })
  ]);
  if (roomCount === 0) {
    return res.status(400).json({ success: false, error: 'Cannot start event: No rooms configured. Please set up at least one room first.' });
  }
  if (shortlistedCount === 0) {
    return res.status(400).json({ success: false, error: 'Cannot start event: No shortlisted candidates. Please upload a shortlist first.' });
  }

  const drive = await DriveModel.findOneAndUpdate(
    { _id: driveId, collegeId },
    { status: 'event_day' },
    { new: true }
  );

  if (!drive) return res.status(404).json({ success: false, error: 'Drive not found' });

  // Auto-start QR rotation immediately
  try { await startQRRotation(driveId, getIO()); } catch (e) {
    console.warn('QR auto-start failed (non-fatal):', e);
  }

  // Invalidate cache + broadcast status change
  try { await AppCache.del(generateCacheKey('drive-by-id', { driveId, collegeId })); } catch {}
  try {
    getIO().to(`drive:${driveId}`).emit('drive:status_changed', {
      driveId, status: 'event_day', companyName: drive.companyName
    });
  } catch {}

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

  try { await AppCache.del(generateCacheKey('drive-by-id', { driveId, collegeId })); } catch {}
  try {
    getIO().to(`drive:${driveId}`).emit('drive:status_changed', { driveId, status: 'completed', companyName: drive.companyName });
  } catch {}

  res.status(200).json({ success: true, data: drive });
});

// POST /api/v1/drives/:driveId/finalize
export const finalizeDrive = asyncHandler(async (req: Request, res: Response) => {
  const driveId = req.params.driveId;
  const collegeId = (req as any).user.collegeId;

  // 1. Update Drive document status to completed
  const drive = await DriveModel.findOneAndUpdate(
    { _id: driveId, collegeId },
    { status: 'completed' },
    { new: true }
  );

  if (!drive) return res.status(404).json({ success: false, error: 'Drive not found' });

  // 2. Generate CSV & save to GridFS
  let csvUrl = '';
  try {
    csvUrl = await generateFinalCSV(driveId, collegeId);
    
    // Add to drive resources if applicable, or keep in metadata
    if (!(drive as any).resources) {
      (drive as any).resources = [];
    }
    (drive as any).resources.push({
      title: 'ERP Selected Candidates CSV',
      url: csvUrl,
      addedAt: new Date()
    });
    await drive.save();

  } catch (err: any) {
    console.error('Failed to generate final CSV:', err);
    // Proceed anyways
  }

  // 3. Collect applicationIds of selected students
  const selectedApps = await ApplicationModel.find({ driveId, status: 'selected' }).select('_id').lean();
  const applicationIds = selectedApps.map(app => app._id.toString());

  // 4. Fire-and-forget: enqueueMassEmail
  if (applicationIds.length > 0) {
    try {
      await enqueueMassEmail({
        applicationIds,
        type: 'offer',
        collegeId,
        companyName: drive.companyName,
        role: drive.jobRole || 'Role',
        driveDate: new Date(drive.eventDate || new Date())
      });
    } catch (err) {
      console.error('Failed to enqueue mass email job:', err);
    }
  }

  // 5. Fire-and-forget: AI Mentor Plan Compilation
  try {
    await enqueueAIMentorJob(driveId, collegeId);
  } catch (err) {
    console.error('Failed to enqueue AI Mentor job:', err);
  }

  // Cache invalidation and Socket IO notification
  try { await AppCache.del(generateCacheKey('drive-by-id', { driveId, collegeId })); } catch {}
  try {
    getIO().to(`drive:${driveId}`).emit('drive:status_changed', { driveId, status: 'completed', companyName: drive.companyName });
  } catch {}

  res.status(200).json({ 
    success: true, 
    data: { 
      drive,
      csvUrl,
      emailsQueued: applicationIds.length
    } 
  });
});

// GET /api/v1/drives/:driveId/archive
// 1-Click Archive & Compliance Report
export const archiveDrive = asyncHandler(async (req: Request, res: Response) => {
  const driveId = req.params.driveId;
  const collegeId = (req as any).user.collegeId;

  const drive = await DriveModel.findOneAndUpdate(
    { _id: driveId, collegeId },
    { status: 'archived' },
    { new: true }
  );

  if (!drive) return res.status(404).json({ success: false, error: 'Drive not found' });

  const workbook = new exceljs.Workbook();
  const apps = await ApplicationModel.find({ driveId }).lean();
  const notifications = await NotificationModel.find({ driveId }).populate('applicationId', 'data candidateEmail referenceNumber').lean();

  // Sheet 1: All Applications
  const sheet1 = workbook.addWorksheet('All Applications');
  sheet1.columns = [
    { header: 'Ref#', key: 'ref', width: 20 },
    { header: 'Name', key: 'name', width: 25 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Email', key: 'email', width: 25 },
    { header: 'Phone', key: 'phone', width: 15 },
    { header: 'Applied At', key: 'date', width: 20 }
  ];
  sheet1.getRow(1).font = { bold: true };
  sheet1.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
  apps.forEach(app => {
    sheet1.addRow({
      ref: (app as any).referenceNumber || '-',
      name: app.data?.name || app.data?.fullName || '-',
      status: app.status,
      email: app.data?.email || (app as any).candidateEmail || '-',
      phone: app.data?.phone || '-',
      date: new Date((app as any).createdAt || Date.now()).toLocaleString()
    });
  });

  // Sheet 2: Shortlist & Selected
  const sheet2 = workbook.addWorksheet('Offers & Shortlists');
  sheet2.columns = [
    { header: 'Ref#', key: 'ref', width: 20 },
    { header: 'Name', key: 'name', width: 25 },
    { header: 'Final Status', key: 'status', width: 15 }
  ];
  sheet2.getRow(1).font = { bold: true };
  sheet2.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10B981' } };
  apps.filter(a => a.status === 'selected' || a.status === 'shortlisted').forEach(app => {
    sheet2.addRow({
      ref: (app as any).referenceNumber || '-',
      name: app.data?.name || app.data?.fullName || '-',
      status: app.status.toUpperCase()
    });
  });

  // Sheet 3: Communications Audit
  const sheet3 = workbook.addWorksheet('Audit Log');
  sheet3.columns = [
    { header: 'Date', key: 'date', width: 25 },
    { header: 'Candidate Ref', key: 'ref', width: 20 },
    { header: 'Channel', key: 'channel', width: 15 },
    { header: 'Type', key: 'type', width: 15 },
    { header: 'Delivery Status', key: 'status', width: 15 },
    { header: 'Error (if any)', key: 'error', width: 30 }
  ];
  sheet3.getRow(1).font = { bold: true };
  sheet3.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF59E0B' } };
  notifications.forEach(log => {
      sheet3.addRow({
          date: log.sentAt ? new Date(log.sentAt).toLocaleString() : '-',
          ref: (log.applicationId as any)?.referenceNumber || '-',
          channel: log.channel,
          type: log.recipientType,
          status: log.status,
          error: log.errorMessage || '-'
      });
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=${(drive?.companyName || 'Drive').replace(/\s+/g,'_')}_Compliance_Archive.xlsx`);

  // Broadcast archived status before streaming response
  try { await AppCache.del(generateCacheKey('drive-by-id', { driveId, collegeId })); } catch {}
  try {
    getIO().to(`drive:${driveId}`).emit('drive:status_changed', { driveId, status: 'archived', companyName: drive?.companyName });
  } catch {}

  await workbook.xlsx.write(res);
  res.end();
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
    tags: (sourceDrive as any).tags || [],
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

  await logAuditEvent({
    userId: (req as any).user.userId,
    action: 'CLONE_DRIVE',
    resourceType: 'Drive',
    resourceId: newDrive._id.toString(),
    details: `Cloned drive from source ${driveId}`,
    ipAddress: req.ip || req.socket.remoteAddress
  });

  // Broadcast new drive to dashboard live feed
  try {
    getIO().emit('drive:created', { driveId: newDrive._id.toString(), companyName: newDrive.companyName, collegeId });
  } catch {}

  res.status(201).json({ success: true, data: newDrive });
});

// PATCH /api/v1/drives/:driveId/settings
export const updateSettings = asyncHandler(async (req: Request, res: Response) => {
  const driveId = req.params.driveId;
  const collegeId = (req as any).user.collegeId;
  
  // Destructure allowed settings to prevent over-posting
  const { enableQueueTracking, walkInEnabled } = req.body;
  
  const updatePayload: any = {};
  if (enableQueueTracking !== undefined) updatePayload.enableQueueTracking = enableQueueTracking;
  if (walkInEnabled !== undefined) updatePayload.walkInEnabled = walkInEnabled;

  const updatedDrive = await DriveModel.findOneAndUpdate(
    { _id: driveId, collegeId },
    { $set: updatePayload },
    { new: true }
  );

  if (!updatedDrive) return res.status(404).json({ success: false, error: 'Drive not found' });

  await logAuditEvent({
    userId: (req as any).user.userId,
    action: 'UPDATE_DRIVE_SETTINGS',
    resourceType: 'Drive',
    resourceId: driveId,
    details: `Updated settings: ${JSON.stringify(updatePayload)}`,
    ipAddress: req.ip || req.socket.remoteAddress
  });

  res.status(200).json({ success: true, data: updatedDrive });
});

// PATCH /api/v1/drives/:driveId/pause
export const toggleDrivePause = asyncHandler(async (req: Request, res: Response) => {
  const driveId = req.params.driveId;
  const collegeId = (req as any).user.collegeId;
  const { isPaused } = req.body;
  
  if (typeof isPaused !== 'boolean') {
    return res.status(400).json({ success: false, error: 'isPaused boolean is required' });
  }

  const updatedDrive = await DriveModel.findOneAndUpdate(
    { _id: driveId, collegeId },
    { $set: { isPaused } },
    { new: true }
  );

  if (!updatedDrive) {
    return res.status(404).json({ success: false, error: 'Drive not found' });
  }

  // FIX: was emitting to 'drive_${driveId}' (underscore) — changed to colon format
  try { getIO().to(`drive:${driveId}`).emit('drive:paused', { isPaused }); } catch {}
  
  res.status(200).json({ success: true, data: updatedDrive });
});

// POST /api/v1/drives/:id/purge-noshows
export const purgeNoShows = asyncHandler(async (req: Request, res: Response) => {
  const collegeId = (req as any).user.collegeId;
  const driveId = req.params.id;

  const drive = await DriveModel.findOne({ _id: driveId, collegeId });
  if (!drive) return res.status(404).json({ success: false, error: 'Drive not found' });

  // Find students who are about to be purged to increment their strikes.
  // Note: We use 'applied' as well to catch people who applied but never checked in.
  // But to preserve existing behavior, it targets 'shortlisted' or whatever criteria admin sets.
  const appsToPurge = await ApplicationModel.find(
    { driveId, status: { $in: ['shortlisted', 'applied'] } }
  ).lean();

  const usnList = appsToPurge.map(app => (app.data as any)?.usn).filter(Boolean);

  if (usnList.length > 0) {
    await StudentProfileModel.updateMany(
      { collegeId, usn: { $in: usnList } },
      { $inc: { strikes: 1 } }
    );
  }

  const result = await ApplicationModel.updateMany(
    { driveId, status: { $in: ['shortlisted', 'applied'] } },
    { $set: { status: 'rejected' } }
  );

  // Clear cache
  const cacheKey = generateCacheKey('drives', { collegeId, driveId });
  await AppCache.del(cacheKey);

  await logAuditEvent({
    userId: (req as any).user.userId,
    action: 'PURGE_NO_SHOWS',
    resourceType: 'Drive',
    resourceId: driveId,
    details: `Purged ${result.modifiedCount} no-shows and incremented strikes.`,
    ipAddress: req.ip || req.socket.remoteAddress
  });

  res.status(200).json({
    success: true,
    data: {
      purgedCount: result.modifiedCount
    }
  });
});

import { AuditLogModel } from '../models/audit-log.model';

// GET /api/v1/drives/:driveId/audit-logs
export const getAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const driveId = req.params.driveId;
  const collegeId = (req as any).user.collegeId;

  // Ensure the drive belongs to this college admin
  const drive = await DriveModel.findOne({ _id: driveId, collegeId }).lean();
  if (!drive) return res.status(404).json({ success: false, error: 'Drive not found' });

  const logs = await AuditLogModel.find({ resourceId: driveId })
    .populate('userId', 'name email')
    .sort({ createdAt: -1 })
    .lean();

  res.status(200).json({
    success: true,
    data: logs
  });
});

// GET /api/v1/drives/schedule/check-conflict
export const checkConflict = asyncHandler(async (req: Request, res: Response) => {
  const collegeId = (req as any).user.collegeId;
  const { date, excludeDriveId } = req.query;

  if (!date) return res.status(400).json({ success: false, error: 'Date is required' });

  const startOfDay = new Date(date as string);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date as string);
  endOfDay.setHours(23, 59, 59, 999);

  const query: any = {
    collegeId,
    eventDate: { $gte: startOfDay, $lte: endOfDay },
    status: { $nin: ['completed', 'archived'] }
  };

  if (excludeDriveId) {
    query._id = { $ne: excludeDriveId };
  }

  const overlappingDrives = await DriveModel.find(query)
    .select('companyName jobRole eventDate')
    .lean();

  res.status(200).json({
    success: true,
    data: {
      hasConflict: overlappingDrives.length > 0,
      conflictingDrives: overlappingDrives
    }
  });
});

// GET /api/v1/drives/:driveId/match
export const matchCandidates = asyncHandler(async (req: Request, res: Response) => {
  const collegeId = (req as any).user.collegeId;
  const { driveId } = req.params;

  const drive = await DriveModel.findOne({ _id: driveId, collegeId }).lean();
  if (!drive) return res.status(404).json({ success: false, error: 'Drive not found' });

  const matchQuery: any = { collegeId: new mongoose.Types.ObjectId(collegeId) };
  
  if ((drive.eligibility?.cgpa?.minimum ?? 0) > 0) {
    matchQuery.cgpa = { $gte: drive.eligibility?.cgpa?.minimum };
  }
  if (drive.eligibility?.branches && drive.eligibility.branches.length > 0) {
    matchQuery.branch = { $in: drive.eligibility.branches };
  }
  if (drive.eligibility?.tenth?.required && (drive.eligibility?.tenth?.minPercentage || 0) > 0) {
    matchQuery.tenthPercentage = { $gte: drive.eligibility.tenth.minPercentage };
  }
  if (drive.eligibility?.twelfth?.required && (drive.eligibility?.twelfth?.minPercentage || 0) > 0) {
    matchQuery.twelfthPercentage = { $gte: drive.eligibility.twelfth.minPercentage };
  }
  if (drive.eligibility?.diploma?.required && (drive.eligibility?.diploma?.minCGPA || 0) > 0) {
    matchQuery.diplomaCGPA = { $gte: drive.eligibility.diploma.minCGPA };
  }

  const potentialCandidates = await StudentProfileModel.find(matchQuery).lean();

  const existingApps = await ApplicationModel.find({ driveId }).select('data').lean();
  const appliedEmails = existingApps.map(app => (app.data?.email || app.data?.Email)?.toLowerCase()).filter(Boolean);
  const appliedUSNs = existingApps.map(app => (app.data?.usn || app.data?.USN)?.toLowerCase()).filter(Boolean);

  const matched = potentialCandidates.filter(candidate => {
    return !appliedEmails.includes(candidate.email?.toLowerCase()) && !appliedUSNs.includes(candidate.usn?.toLowerCase());
  });

  res.status(200).json({
    success: true,
    data: {
      totalFound: potentialCandidates.length,
      alreadyApplied: potentialCandidates.length - matched.length,
      matchedCandidates: matched
    }
  });
});

// GET /api/v1/drives/:driveId/funnel
export const getDriveFunnel = asyncHandler(async (req: Request, res: Response) => {
  const driveId = req.params.driveId;
  const collegeId = (req as any).user.collegeId;

  const drive = await DriveModel.findOne({ _id: driveId, collegeId }).lean();
  if (!drive) return res.status(404).json({ success: false, error: 'Drive not found' });

  const cacheKey = generateCacheKey('drive-funnel', { driveId });
  const cachedData = await AppCache.get(cacheKey);
  if (cachedData) {
     return res.status(200).json({ success: true, data: cachedData, cached: true });
  }

  const counts = await ApplicationModel.aggregate([
    { $match: { driveId: new mongoose.Types.ObjectId(driveId) } },
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);

  const funnel = { applied: 0, shortlisted: 0, invited: 0, attended: 0, test_passed: 0, interview_passed: 0, selected: 0, rejected: 0, total: 0 };
  
  counts.forEach(({ _id, count }: any) => {
    funnel.total += count;
    if (funnel.hasOwnProperty(_id)) {
      (funnel as any)[_id] = count;
    } else if (_id.includes('passed')) {
       if (_id.includes('test')) funnel.test_passed += count;
       else funnel.interview_passed += count;
    } else if (_id.includes('failed')) {
       funnel.rejected += count;
    }
  });

  await AppCache.set(cacheKey, funnel, 60); // cache for 60s
  res.status(200).json({ success: true, data: funnel, cached: false });
});

// ── Zod schema for the dispatch-hrs payload ─────────────────────────────────
const dispatchHRsSchema = z.object({
  allocations: z.array(z.object({
    hrEmail: z.string().email('Invalid HR email'),
    hrName:  z.string().min(1, 'HR name is required'),
    roomId:  z.string().min(1, 'roomId is required'),
  })).min(1, 'At least one allocation is required'),
});

// POST /api/v1/drives/:driveId/dispatch-hrs
export const dispatchHRs = asyncHandler(async (req: Request, res: Response) => {
  const { driveId } = req.params;

  // 1. Validate payload
  const parsed = dispatchHRsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, errors: parsed.error.flatten().fieldErrors });
  }

  const { allocations } = parsed.data;

  // 2. Confirm drive exists
  const drive = await DriveModel.findById(driveId).lean();
  if (!drive) return res.status(404).json({ success: false, error: 'Drive not found' });

  const secret = process.env.JWT_ACCESS_SECRET!;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost';

  const results: { hrEmail: string; hrName: string; roomId: string; token: string; magicLink: string }[] = [];

  for (const alloc of allocations) {
    const { hrEmail, hrName, roomId } = alloc;

    // 3. Generate a 24-hour panelist JWT
    const payload = {
      email:   hrEmail,
      name:    hrName,
      roomId,
      driveId,
      role:    'invigilator',
    };
    const token = jwt.sign(payload, secret, { expiresIn: '24h' });
    const magicLink = `${frontendUrl}/invigilator/${token}`;

    // 4. Upsert panelist into the Room document (avoid duplicate entries)
    await RoomModel.findByIdAndUpdate(
      roomId,
      {
        $addToSet: {
          panelists: { name: hrName, email: hrEmail, expertise: [] },
        },
      },
      { new: true },
    );

    results.push({ hrEmail, hrName, roomId, token, magicLink });
  }

  // 5. Audit log
  await logAuditEvent({
    userId: (req as any).user.userId || (req as any).user._id,
    action: 'DISPATCH_HR_MAGIC_LINKS',
    resourceType: 'Drive',
    resourceId: driveId,
    details: `Dispatched ${results.length} Magic Links to HR panelists: ${results.map(r => r.hrEmail).join(', ')}`,
    ipAddress: req.ip || req.socket.remoteAddress
  });

  return res.status(200).json({
    success: true,
    message: `${results.length} Magic Link(s) generated. Copy and send them to the HR panelists.`,
    data: results,
  });
});
