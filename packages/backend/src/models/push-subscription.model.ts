import mongoose, { Schema, Document } from 'mongoose';
import { PushSubscription } from '@campuspool/shared';

const pushSubscriptionSchema = new Schema({
  applicationId: { type: Schema.Types.ObjectId, ref: 'Application', required: true },
  driveId: { type: Schema.Types.ObjectId, ref: 'Drive', required: true },
  subscription: {
    endpoint: { type: String, required: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true }
    }
  }
}, {
  timestamps: true
});

pushSubscriptionSchema.index({ applicationId: 1 });
pushSubscriptionSchema.index({ driveId: 1 });

export const PushSubscriptionModel = mongoose.model<PushSubscription & Document>('PushSubscription', pushSubscriptionSchema, 'pushSubscriptions');
