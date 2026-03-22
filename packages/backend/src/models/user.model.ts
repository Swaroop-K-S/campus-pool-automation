import mongoose, { Schema, Document } from 'mongoose';
import { User, RoleEnum } from '@campuspool/shared';

const userSchema = new Schema({
  collegeId: { type: Schema.Types.ObjectId, ref: 'College' },
  name: { type: String, required: true },
  email: { type: String, required: true, lowercase: true },
  passwordHash: { type: String },
  role: { type: String, enum: Object.values(RoleEnum.enum), required: true },
  driveId: { type: Schema.Types.ObjectId, ref: 'Drive' },
  roomId: { type: Schema.Types.ObjectId, ref: 'Room' },
  isActive: { type: Boolean, default: true },
  refreshToken: { type: String }
}, {
  timestamps: true
});

userSchema.index({ collegeId: 1, email: 1 }, { unique: true });
userSchema.index({ role: 1 });
userSchema.index({ driveId: 1 });

export const UserModel = mongoose.model<User & Document>('User', userSchema, 'users');
