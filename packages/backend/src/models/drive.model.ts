import mongoose, { Schema, Document } from 'mongoose';
import { Drive, DriveStatusEnum, RoundTypeEnum, RoundStatusEnum } from '@campuspool/shared';

const driveSchema = new Schema({
  collegeId: { type: Schema.Types.ObjectId, ref: 'College', required: true },
  companyName: { type: String, required: true },
  jobRole: { type: String, required: true },
  ctc: { type: String, required: true },
  locations: [{ type: String }],
  eligibility: {
    minCGPA: { type: Number },
    branches: [{ type: String }]
  },
  rounds: [{
    type: { type: String, enum: Object.values(RoundTypeEnum.enum) },
    order: { type: Number },
    status: { type: String, enum: Object.values(RoundStatusEnum.enum), default: 'pending' }
  }],
  formToken: { type: String, unique: true, sparse: true },
  status: { type: String, enum: Object.values(DriveStatusEnum.enum), default: 'draft' },
  eventDate: { type: Date },
  reportTime: { type: String },
  venueDetails: {
    hallName: String,
    capacity: Number
  },
  schedule: [{
    roundType: String,
    startTime: String,
    duration: Number
  }],
  formOpenDate: { type: Date, default: null },
  formCloseDate: { type: Date, default: null },
  formStatus: { 
    type: String, 
    enum: ['not_configured', 'scheduled', 'open', 'closed', 'extended'],
    default: 'not_configured'
  },
  formExtensions: [{
    extendedBy: String,
    previousCloseDate: Date,
    newCloseDate: Date,
    reason: String,
    extendedAt: Date
  }]
}, {
  timestamps: true
});

driveSchema.index({ collegeId: 1 });
driveSchema.index({ status: 1 });
driveSchema.index({ collegeId: 1, status: 1 });

export const DriveModel = mongoose.model<Drive & Document>('Drive', driveSchema, 'drives');
