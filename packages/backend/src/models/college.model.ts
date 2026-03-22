import mongoose, { Schema, Document } from 'mongoose';
import { College } from '@campuspool/shared';

const collegeSchema = new Schema({
  name: { type: String, required: true },
  address: { type: String, required: true },
  logo: { type: Schema.Types.ObjectId }, // GridFS ref
  smtpConfig: {
    host: String,
    port: Number,
    user: String,
    pass: String
  },
  twilioConfig: {
    accountSid: String,
    authToken: String,
    fromNumber: String
  },
  vapidPublicKey: String,
  vapidPrivateKey: String,
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

collegeSchema.index({ name: 1 });
collegeSchema.index({ isActive: 1 });

export const CollegeModel = mongoose.model<College & Document>('College', collegeSchema, 'colleges');
