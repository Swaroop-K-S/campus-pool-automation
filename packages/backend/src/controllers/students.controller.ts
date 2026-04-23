import { Request, Response } from 'express';
import { StudentProfileModel } from '../models';
import { logAuditEvent } from '../services/audit.service';

// GET /api/v1/students/watchlist
// Returns all students in this college who have 1+ strikes
export const getStudentWatchlist = async (req: Request, res: Response) => {
  try {
    const collegeId = (req as any).user?.collegeId;

    const students = await StudentProfileModel.find({
      collegeId,
      strikes: { $gt: 0 }
    })
      .sort({ strikes: -1, lastSeen: -1 })
      .lean();

    return res.json({ success: true, data: students });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ success: false, error: message });
  }
};

// GET /api/v1/students/all
// Returns all student profiles for this college (paginated)
export const getAllStudents = async (req: Request, res: Response) => {
  try {
    const collegeId = (req as any).user?.collegeId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const search = (req.query.search as string) || '';

    const query: any = { collegeId };
    if (search) {
      query.$or = [
        { usn: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { branch: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await StudentProfileModel.countDocuments(query);
    const students = await StudentProfileModel.find(query)
      .sort({ strikes: -1, name: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return res.json({
      success: true,
      data: { students, total, page, totalPages: Math.ceil(total / limit) }
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ success: false, error: message });
  }
};

// PATCH /api/v1/students/:usn/strikes
// Set strikes for a student (admin action)
export const updateStudentStrikes = async (req: Request, res: Response) => {
  try {
    const { usn } = req.params;
    const collegeId = (req as any).user?.collegeId;
    const { strikes, reason } = req.body;

    if (typeof strikes !== 'number' || strikes < 0) {
      return res.status(400).json({ success: false, error: 'strikes must be a non-negative number' });
    }

    const student = await StudentProfileModel.findOneAndUpdate(
      { usn, collegeId },
      { $set: { strikes } },
      { new: true }
    );

    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }

    await logAuditEvent({
      userId: (req as any).user.userId,
      action: 'UPDATE_STUDENT_STRIKES',
      resourceType: 'StudentProfile',
      resourceId: usn,
      details: `Set strikes to ${strikes} for USN ${usn}${reason ? ` — Reason: ${reason}` : ''}`,
      ipAddress: req.ip || req.socket.remoteAddress
    });

    return res.json({ success: true, data: student });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ success: false, error: message });
  }
};

// POST /api/v1/students/:usn/strikes/clear
// Convenience: clear all strikes to 0
export const clearStudentStrikes = async (req: Request, res: Response) => {
  req.body = { ...req.body, strikes: 0 };
  return updateStudentStrikes(req, res);
};

import { CloudinaryProvider } from '../services/storage/cloudinary.provider';
import { parsePdfBuffer } from '../services/resume-parser.service';
import { enqueueResumeParsing } from '../workers/resume.worker';

// POST /api/v1/students/:usn/resume
// Accepts a PDF via multer, immediately streams to Cloudinary, extracts text, queues BullMQ JSON task, and returns 202
export const uploadResume = async (req: Request, res: Response) => {
  try {
    const { usn } = req.params;
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, error: 'Resume PDF missing from request.' });
    }

    const student = await StudentProfileModel.findOne({ usn });
    if (!student) {
      return res.status(404).json({ success: false, error: 'Student Profile not found.' });
    }

    // Simultaneously fire off Cloudinary backend upload and PDF parsing
    const buffer = file.buffer;
    
    // We await both to ensure we have the Cloudinary URL and the raw text before returning 202
    // and sending to BullMQ. Since Cloudinary is ~1000ms and pdf-parse is ~50ms, this is acceptable.
    const [cloudinaryUrl, rawText] = await Promise.all([
      CloudinaryProvider.uploadBuffer(buffer, `campuspool/resumes/${usn}`),
      parsePdfBuffer(buffer)
    ]);

    // Update Student Profile with the final URL immediately
    student.resumeUrl = cloudinaryUrl;
    student.parsingStatus = 'pending';
    await student.save();

    // Fire & Forget the BullMQ Job (LLM is slow, don't await)
    enqueueResumeParsing(usn, rawText).catch(err => console.error('[Resume BullMQ Submit Error]', err));

    return res.status(202).json({ 
      success: true, 
      data: { 
        resumeUrl: cloudinaryUrl, 
        message: 'Resume accepted. AI Agent is processing the document.' 
      } 
    });

  } catch (error: unknown) {
    console.error('[uploadResume] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error updating resume';
    return res.status(500).json({ success: false, error: message });
  }
};
