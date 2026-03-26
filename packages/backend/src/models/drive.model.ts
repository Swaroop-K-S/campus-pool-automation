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
    branches: [{ type: String }],
    tenth: {
      required: { type: Boolean, default: false },
      minPercentage: { type: Number, default: 0 }
    },
    twelfth: {
      required: { type: Boolean, default: false },
      minPercentage: { type: Number, default: 0 }
    },
    diploma: {
      required: { type: Boolean, default: false },
      minCGPA: { type: Number, default: 0 }
    }
  },
  rounds: [{
    type: { type: String, required: true },
    label: { type: String },
    order: { type: Number },
    status: { type: String, enum: ['pending', 'active', 'completed'], default: 'pending' },
    isCustom: { type: Boolean, default: false }
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
  }],
  tags: [{ type: String }]
}, {
  timestamps: true
});

driveSchema.index({ collegeId: 1 });
driveSchema.index({ status: 1 });
driveSchema.index({ collegeId: 1, status: 1 });

export const DriveModel = mongoose.model<Drive & Document>('Drive', driveSchema, 'drives');
