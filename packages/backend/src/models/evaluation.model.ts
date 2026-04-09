import mongoose, { Schema, Document } from 'mongoose';

export interface Evaluation extends Document {
  applicationId: mongoose.Types.ObjectId;
  driveId: mongoose.Types.ObjectId;
  roomId?: mongoose.Types.ObjectId;
  roundType: string;
  evaluatorName: string;
  scores: {
    trait: string;
    score: number; // e.g. 1-10
  }[];
  comments?: string;
  decision: 'Pass' | 'Fail';
  evaluatedAt: Date;
}

const evaluationSchema = new Schema({
  applicationId: { type: Schema.Types.ObjectId, ref: 'Application', required: true },
  driveId: { type: Schema.Types.ObjectId, ref: 'Drive', required: true },
  roomId: { type: Schema.Types.ObjectId, ref: 'Room' }, // Optional, mostly for tracing back
  roundType: { type: String, required: true },
  evaluatorName: { type: String, required: true },
  scores: [{
    trait: { type: String, required: true },
    score: { type: Number, min: 1, max: 10, required: true }
  }],
  comments: { type: String },
  decision: { type: String, enum: ['Pass', 'Fail'], required: true },
  evaluatedAt: { type: Date, default: Date.now }
});

export const EvaluationModel = mongoose.model<Evaluation>('Evaluation', evaluationSchema);
