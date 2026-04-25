import { StudentProfileModel } from '../models';
import { CloudinaryProvider } from '../services/storage/cloudinary.provider';
import { parsePdfBuffer } from '../services/resume-parser.service';
import { enqueueResumeParsing } from '../workers/resume.worker';
import { logAuditEvent } from '../services/audit.service';

export class StudentsService {
  static async getStudentWatchlist(collegeId: string) {
    return await StudentProfileModel.find({ collegeId, strikes: { $gt: 0 } })
      .sort({ strikes: -1, lastSeen: -1 })
      .lean();
  }

  static async getAllStudents(collegeId: string, page: number, limit: number, search: string) {
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

    return { students, total, page, totalPages: Math.ceil(total / limit) };
  }

  static async updateStudentStrikes(usn: string, collegeId: string, strikes: number, reason: string, userId: string, ipAddress: string) {
    const student = await StudentProfileModel.findOneAndUpdate(
      { usn, collegeId },
      { $set: { strikes } },
      { new: true }
    );

    if (student) {
      await logAuditEvent({
        userId,
        action: 'UPDATE_STUDENT_STRIKES',
        resourceType: 'StudentProfile',
        resourceId: usn,
        details: `Set strikes to ${strikes} for USN ${usn}${reason ? ` — Reason: ${reason}` : ''}`,
        ipAddress
      });
    }
    return student;
  }

  static async processAndUploadResume(usn: string, buffer: Buffer) {
    const student = await StudentProfileModel.findOne({ usn });
    if (!student) throw new Error('Student Profile not found.');

    const [cloudinaryUrl, rawText] = await Promise.all([
      CloudinaryProvider.uploadBuffer(buffer, `campuspool/resumes/${usn}`),
      parsePdfBuffer(buffer)
    ]);

    student.resumeUrl = cloudinaryUrl;
    student.parsingStatus = 'pending';
    await student.save();

    enqueueResumeParsing(usn, rawText).catch(err => console.error('[Resume BullMQ Submit Error]', err));
    return cloudinaryUrl;
  }
}
