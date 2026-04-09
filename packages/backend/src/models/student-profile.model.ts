import mongoose, { Schema, Document } from 'mongoose';

export interface IStudentProfile {
  usn: string;
  name: string;
  email: string;
  phone?: string;
  branch?: string;
  collegeId?: mongoose.Types.ObjectId;
  lastSeen?: Date;
}

const studentProfileSchema = new Schema({
  usn: { type: String, required: true, uppercase: true, trim: true },
  name: { type: String, required: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  phone: { type: String },
  branch: { type: String },
  collegeId: { type: Schema.Types.ObjectId, ref: 'College' },
  lastSeen: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Unique per college — same student can appear in multiple colleges (edge case)
studentProfileSchema.index({ usn: 1, collegeId: 1 }, { unique: true });
studentProfileSchema.index({ email: 1 });

export const StudentProfileModel = mongoose.model<IStudentProfile & Document>(
  'StudentProfile',
  studentProfileSchema,
  'student_profiles'
);
