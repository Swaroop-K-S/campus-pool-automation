import { Request, Response } from 'express';
import { StudentsService } from '../services/students.service';

export const getStudentWatchlist = async (req: Request, res: Response) => {
  try {
    const collegeId = (req as any).user?.collegeId;
    const students = await StudentsService.getStudentWatchlist(collegeId);
    return res.json({ success: true, data: students });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const getAllStudents = async (req: Request, res: Response) => {
  try {
    const collegeId = (req as any).user?.collegeId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const search = (req.query.search as string) || '';

    const data = await StudentsService.getAllStudents(collegeId, page, limit, search);
    return res.json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const updateStudentStrikes = async (req: Request, res: Response) => {
  try {
    const { usn } = req.params;
    const collegeId = (req as any).user?.collegeId;
    const { strikes, reason } = req.body;
    const userId = (req as any).user.userId;

    if (typeof strikes !== 'number' || strikes < 0) {
      return res.status(400).json({ success: false, error: 'strikes must be a non-negative number' });
    }

    const student = await StudentsService.updateStudentStrikes(usn, collegeId, strikes, reason, userId, req.ip || req.socket.remoteAddress as string);
    if (!student) return res.status(404).json({ success: false, error: 'Student not found' });

    return res.json({ success: true, data: student });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const clearStudentStrikes = async (req: Request, res: Response) => {
  req.body = { ...req.body, strikes: 0 };
  return updateStudentStrikes(req, res);
};

export const uploadResume = async (req: Request, res: Response) => {
  try {
    const { usn } = req.params;
    const file = req.file;
    if (!file) return res.status(400).json({ success: false, error: 'Resume PDF missing from request.' });

    const resumeUrl = await StudentsService.processAndUploadResume(usn, file.buffer);
    
    return res.status(202).json({ 
      success: true, 
      data: { resumeUrl, message: 'Resume accepted. AI Agent is processing the document.' } 
    });
  } catch (error: any) {
    return res.status(error.message.includes('not found') ? 404 : 500).json({ success: false, error: error.message });
  }
};
