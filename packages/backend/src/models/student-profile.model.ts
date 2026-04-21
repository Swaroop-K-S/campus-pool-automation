import mongoose, { Schema, Document } from 'mongoose';

export interface IStudentProfile {
  usn: string;
  name: string;
  email: string;
  phone?: string;
  branch?: string;
  collegeId?: mongoose.Types.ObjectId;
  strikes?: number;
  lastSeen?: Date;
  
  // Academic Data (For Idea A: Match Engine)
  cgpa?: number;
  tenthPercentage?: number;
  twelfthPercentage?: number;
  diplomaCGPA?: number;
  educationPath?: '12th Standard / PUC' | 'Diploma (Lateral Entry)' | 'Other';
  
  // Portfolio Data (For Idea D: Resume Builder)
  skills?: string[];
  certifications?: string[];
  projects?: {
    title: string;
    description: string;
    url?: string;
  }[];

  // AI Mentor
  improvementPlan?: {
    strengths: string[];
    criticalWeakness: string;
    actionableNextSteps: string[];
    generatedAt: Date;
    driveId?: mongoose.Types.ObjectId;
  };
}

const studentProfileSchema = new Schema({
  usn: { type: String, required: true, uppercase: true, trim: true },
  name: { type: String, required: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  phone: { type: String },
  branch: { type: String },
  collegeId: { type: Schema.Types.ObjectId, ref: 'College' },
  strikes: { type: Number, default: 0 },
  lastSeen: { type: Date, default: Date.now },

  // Academic extensions
  cgpa: { type: Number },
  tenthPercentage: { type: Number },
  twelfthPercentage: { type: Number },
  diplomaCGPA: { type: Number },
  educationPath: { type: String, enum: ['12th Standard / PUC', 'Diploma (Lateral Entry)', 'Other'] },

  // Portfolio extensions
  skills: [{ type: String }],
  certifications: [{ type: String }],
  projects: [{
    title: { type: String, required: true },
    description: { type: String, required: true },
    url: { type: String }
  }],

  // AI Mentor extensions
  improvementPlan: {
    strengths: [{ type: String }],
    criticalWeakness: { type: String },
    actionableNextSteps: [{ type: String }],
    generatedAt: { type: Date },
    driveId: { type: Schema.Types.ObjectId, ref: 'Drive' }
  }
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
