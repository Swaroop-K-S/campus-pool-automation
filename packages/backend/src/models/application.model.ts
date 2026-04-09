import mongoose, { Schema, Document } from 'mongoose';
import { Application, ApplicationStatusEnum } from '@campuspool/shared';

const applicationSchema = new Schema({
  referenceNumber: { type: String }, // e.g. CP-2025-00421
  driveId: { type: Schema.Types.ObjectId, ref: 'Drive', required: true },
  collegeId: { type: Schema.Types.ObjectId, ref: 'College', required: true },
  data: { type: Schema.Types.Mixed, required: true },
  resumeFileId: { type: Schema.Types.ObjectId }, // Legacy GridFS
  photoFileId: { type: Schema.Types.ObjectId }, // Legacy GridFS
  resumeUrl: { type: String }, // Cloudinary Link
  photoUrl: { type: String }, // Cloudinary Link
  status: { type: String, enum: ["applied", "shortlisted", "invited", "attended", "round_N_passed", "round_N_failed", "selected", "rejected"], default: 'applied' },
  driveStudentId: { type: String, unique: true, sparse: true, index: true },
  currentRound: { type: String },
  attendedAt: { type: Date },
  submittedAt: { type: Date, default: Date.now },
  latecomer: { type: Boolean, default: false },
  adminOverrideTime: { type: Date },
  assignedRoomId: { type: Schema.Types.ObjectId, ref: 'Room', default: null }  // direct room link
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

applicationSchema.index({ driveId: 1, collegeId: 1 });
applicationSchema.index({ driveId: 1, 'data.email': 1 }, { unique: true });
applicationSchema.index({ driveId: 1, 'data.usn': 1 });
applicationSchema.index({ status: 1 });
applicationSchema.index({ collegeId: 1, status: 1 });
applicationSchema.index({ referenceNumber: 1 });
applicationSchema.index({ driveStudentId: 1 }, { unique: true, sparse: true });

applicationSchema.virtual('isSelected').get(function() {
  return this.status === 'selected';
});

export const ApplicationModel = mongoose.model<Application & Document>('Application', applicationSchema, 'applications');
