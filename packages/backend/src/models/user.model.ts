import mongoose, { Schema, Document } from 'mongoose';

export interface IUser {
  collegeId: mongoose.Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: string;
  isActive: boolean;
  refreshToken?: string;
  failedLoginAttempts: number;
  lockUntil?: Date;
  driveId?: mongoose.Types.ObjectId; // For company_hr role — scoped to one drive
}

const userSchema = new Schema({
  collegeId: { type: Schema.Types.ObjectId, ref: 'College' },
  name: { type: String, required: true },
  email: { type: String, required: true, lowercase: true },
  passwordHash: { type: String },
  role: { type: String, default: 'admin' },
  isActive: { type: Boolean, default: true },
  refreshToken: { type: String },
  failedLoginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date },
  driveId: { type: Schema.Types.ObjectId, ref: 'Drive' },
}, {
  timestamps: true
});

userSchema.index({ email: 1 }, { unique: true });

export const UserModel = mongoose.model<IUser & Document>('User', userSchema, 'users');
