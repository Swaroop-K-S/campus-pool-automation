import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { ApplicationModel, StudentProfileModel } from '../models';
import { env } from '../config/env';

// ─────────────────────────────────────────────────────────────────
// POST /passport/verify
// Student provides USN + email. We check it against their application
// records and issue a short-lived passport JWT — no passwords needed.
// ─────────────────────────────────────────────────────────────────
export const verifyStudent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { usn, email } = req.body as { usn: string; email: string };

    if (!usn || !email) {
      res.status(400).json({ success: false, error: 'USN and email are required.' });
      return;
    }

    const usnClean = usn.trim().toUpperCase();
    const emailClean = email.trim().toLowerCase();

    // Find any application matching this USN+email combo (across all drives)
    const application = await ApplicationModel.findOne({
      'data.usn': new RegExp(`^${usnClean}$`, 'i'),
      'data.email': new RegExp(`^${emailClean}$`, 'i'),
    }).select('data.fullName data.email data.usn data.branch data.phone collegeId');

    if (!application) {
      res.status(404).json({
        success: false,
        error: 'No application found with this USN and email combination. Please check your details.',
        code: 'NOT_FOUND'
      });
      return;
    }

    const name: string = (application as any).data?.fullName || (application as any).data?.name || 'Student';
    const branch: string = (application as any).data?.branch || '';
    const phone: string = (application as any).data?.phone || '';
    const collegeId = (application as any).collegeId;

    // Upsert the student profile so it stays current
    await StudentProfileModel.findOneAndUpdate(
      { usn: usnClean, collegeId },
      { $set: { name, email: emailClean, phone, branch, collegeId, lastSeen: new Date() } },
      { upsert: true, new: true }
    );

    // Issue a passport JWT (8h — long enough for a full placement day)
    const passportToken = jwt.sign(
      { usn: usnClean, email: emailClean, name, collegeId: String(collegeId) },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      success: true,
      data: {
        passportToken,
        name,
        usn: usnClean,
        email: emailClean,
        branch
      }
    });
  } catch (err: any) {
    console.error('passport/verify ERROR:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────
// GET /passport/profile
// Returns the student's full cross-drive application history.
// Auth: Bearer passport JWT in Authorization header.
// ─────────────────────────────────────────────────────────────────
export const getPassportProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ success: false, error: 'Passport token required.' });
      return;
    }

    let payload: any;
    try {
      payload = jwt.verify(authHeader.slice(7), env.JWT_ACCESS_SECRET);
    } catch {
      res.status(401).json({ success: false, error: 'Invalid or expired passport token. Please log in again.' });
      return;
    }

    const { usn, email } = payload as { usn: string; email: string };

    // Fetch ALL applications for this student across all drives
    const applications = await ApplicationModel.find({
      'data.usn': new RegExp(`^${usn}$`, 'i'),
      'data.email': new RegExp(`^${email}$`, 'i'),
    })
      .populate('driveId', 'companyName jobRole ctc eventDate status rounds')
      .sort({ submittedAt: -1 })
      .lean();

    // Fetch profile
    const profile = await StudentProfileModel.findOne({ usn, email }).lean();

    // Build summary stats
    const stats = {
      totalDrives: applications.length,
      shortlisted: applications.filter(a => ['shortlisted', 'invited', 'attended', 'selected', 'rejected'].includes(a.status)).length,
      selected: applications.filter(a => a.status === 'selected').length,
      rejected: applications.filter(a => a.status === 'rejected').length,
      pending: applications.filter(a => ['applied'].includes(a.status)).length,
    };

    // Update lastSeen
    await StudentProfileModel.findOneAndUpdate({ usn }, { lastSeen: new Date() });

    // Format drive history  
    const driveHistory = applications.map(app => {
      const drive = app.driveId as any;
      return {
        applicationId: app._id,
        driveStudentId: app.driveStudentId || null,
        status: app.status,
        currentRound: app.currentRound || null,
        submittedAt: app.submittedAt,
        attendedAt: (app as any).attendedAt || null,
        drive: drive ? {
          _id: drive._id,
          companyName: drive.companyName,
          jobRole: drive.jobRole,
          ctc: drive.ctc,
          eventDate: drive.eventDate || null,
          status: drive.status,
        } : null,
      };
    });

    res.json({
      success: true,
      data: {
        profile: profile || { usn, email, name: payload.name || 'Student', branch: payload.branch || '' },
        stats,
        driveHistory,
      }
    });
  } catch (err: any) {
    console.error('passport/profile ERROR:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};
