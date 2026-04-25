import { DriveModel, ApplicationModel } from '../models';
import mongoose from 'mongoose';
import { Drive, DriveStatusEnum } from '@campuspool/shared';

export class DriveService {
  static async getDrivesWithCounts(collegeId: string, includeCount: boolean) {
    let drives = await DriveModel.find({ collegeId }).sort({ createdAt: -1 }).lean();

    if (includeCount) {
      const counts = await ApplicationModel.aggregate([
        { $match: { collegeId: new mongoose.Types.ObjectId(collegeId) } },
        { $group: { 
          _id: { driveId: '$driveId', status: '$status' },
          count: { $sum: 1 }
        }}
      ]);

      drives = drives.map(drive => {
        const driveCounts = counts.filter(c => c._id.driveId?.toString() === drive._id.toString());
        const applicationCount = driveCounts.reduce((acc, curr) => acc + curr.count, 0);
        const shortlistedCount = driveCounts.find(c => c._id.status === 'shortlisted')?.count || 0;
        const selectedCount = driveCounts.find(c => c._id.status === 'selected')?.count || 0;
        
        return { ...drive, applicationCount, shortlistedCount, selectedCount };
      });
    }
    return drives;
  }

  static async createDrive(collegeId: string, payload: any) {
    return await DriveModel.create({
      collegeId,
      companyName: payload.companyName || 'Draft Drive',
      jobRole: payload.jobRole,
      ctc: payload.ctc || 'Not Disclosed',
      locations: payload.locations ? payload.locations.split(',').map((l: string) => l.trim()) : [],
      description: payload.description,
      status: DriveStatusEnum.enum.draft,
      eligibility: payload.eligibilityCriteria || {
        cgpa: { minimum: 0, ruleType: 'strict' },
        branches: [],
        tenth: { required: false, minPercentage: 0, ruleType: 'strict' },
        twelfth: { required: false, minPercentage: 0, ruleType: 'strict' },
        diploma: { required: false, minCGPA: 0, ruleType: 'strict' }
      },
      rounds: payload.rounds || [],
      scorecardTraits: payload.scorecardTraits || [],
      tags: payload.tags || [],
      eventDate: payload.eventDate || null,
      reportTime: payload.reportTime || null
    });
  }

  static async getDriveById(driveId: string, collegeId: string) {
    return await DriveModel.findOne({ _id: driveId, collegeId }).lean();
  }
}
