import mongoose, { Schema, Document } from 'mongoose';
import { QRSession } from '@campuspool/shared';

const qrSessionSchema = new Schema({
  driveId: { type: Schema.Types.ObjectId, ref: 'Drive', required: true },
  token: { type: String, required: true },
  expiresAt: { type: Date, required: true }
}, {
  timestamps: true
});

qrSessionSchema.index({ driveId: 1 });
qrSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

export const QRSessionModel = mongoose.model<QRSession & Document>('QRSession', qrSessionSchema, 'qrSessions');
