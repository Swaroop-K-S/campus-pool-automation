import mongoose, { Schema, Document } from 'mongoose';
import { Notification, NotificationChannelEnum, NotificationRecipientTypeEnum, NotificationStatusEnum } from '@campuspool/shared';

const notificationSchema = new Schema({
  collegeId: { type: Schema.Types.ObjectId, ref: 'College', required: true },
  driveId: { type: Schema.Types.ObjectId, ref: 'Drive', required: true },
  recipientType: { type: String, enum: Object.values(NotificationRecipientTypeEnum.enum), required: true },
  applicationId: { type: Schema.Types.ObjectId, ref: 'Application' },
  channel: { type: String, enum: Object.values(NotificationChannelEnum.enum), required: true },
  status: { type: String, enum: Object.values(NotificationStatusEnum.enum), required: true },
  errorMessage: { type: String },
  sentAt: { type: Date }
}, {
  timestamps: true
});

notificationSchema.index({ collegeId: 1, driveId: 1 });
notificationSchema.index({ channel: 1, status: 1 });

export const NotificationModel = mongoose.model<Notification & Document>('Notification', notificationSchema, 'notifications');
