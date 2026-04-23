import mongoose, { Schema, Document } from 'mongoose';
import { Drive, DriveStatusEnum, RoundTypeEnum, RoundStatusEnum } from '@campuspool/shared';

const roundSchema = new Schema({
  type: { type: String, required: true },
  label: { type: String },
  order: { type: Number },
  status: { type: String, enum: ['pending', 'active', 'completed'], default: 'pending' },
  isCustom: { type: Boolean, default: false }
});

const driveSchema = new Schema({
  collegeId: { type: Schema.Types.ObjectId, ref: 'College', required: true },
  companyName: { type: String, required: true },
  jobRole: { type: String, required: true },
  ctc: { type: String, required: true },
  locations: [{ type: String }],
  eligibility: {
    cgpa: {
      minimum: { type: Number, default: 0 },
      ruleType: { type: String, enum: ['strict', 'relaxed', 'info'], default: 'strict' }
    },
    branches: [{ type: String }],
    tenth: {
      required: { type: Boolean, default: false },
      minPercentage: { type: Number, default: 0 },
      ruleType: { type: String, enum: ['strict', 'relaxed', 'info'], default: 'strict' }
    },
    twelfth: {
      required: { type: Boolean, default: false },
      minPercentage: { type: Number, default: 0 },
      ruleType: { type: String, enum: ['strict', 'relaxed', 'info'], default: 'strict' }
    },
    diploma: {
      required: { type: Boolean, default: false },
      minCGPA: { type: Number, default: 0 },
      ruleType: { type: String, enum: ['strict', 'relaxed', 'info'], default: 'strict' }
    },
    // Unified 12th/Diploma minimum — used when student chooses either path
    minTenthMarks:              { type: Number, default: 0 },
    minTwelfthOrDiplomaMarks:   { type: Number, default: 0 },
    allowActiveBacklogs:        { type: Boolean, default: false },
    maxBacklogs:                { type: Number, default: 0 }  // 0 = no backlogs allowed
  },

  // Dynamic optional fields requested by the admin for the application form
  requestedFields: {
    github:     { type: Boolean, default: false },
    linkedin:   { type: Boolean, default: false },
    portfolio:  { type: Boolean, default: false },
    resumeText: { type: Boolean, default: false }
  },

  // Time-locked application window (stricter than formOpenDate/formCloseDate — enforced by backend guard)
  applicationWindow: {
    startDate:       { type: Date },
    endDate:         { type: Date },
    extensionReason: { type: String }
  },
  rounds: [roundSchema],
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
  rubricSchema: [{
    id: String,
    label: String,
    type: { type: String, enum: ['slider', 'radio', 'text'] },
    options: [String],
    maxScore: Number
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
  scorecardTraits: [{ type: String }],
  enableQueueTracking: { type: Boolean, default: false },
  isPaused: { type: Boolean, default: false },
  walkInEnabled: { type: Boolean, default: false },
  resources: [{
    title: String,
    url: String
  }],
  tags: [{ type: String }]
}, {
  timestamps: true
});

driveSchema.index({ collegeId: 1 });
driveSchema.index({ status: 1 });
driveSchema.index({ collegeId: 1, status: 1 });

export const DriveModel = mongoose.model<Drive & Document>('Drive', driveSchema, 'drives');
