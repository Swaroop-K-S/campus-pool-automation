import { z } from 'zod';
import { ObjectIdSchema } from './college.schema';
import { NotificationChannelEnum, NotificationRecipientTypeEnum, NotificationStatusEnum } from '../types/enums';

export const NotificationSchema = z.object({
  _id: ObjectIdSchema.optional(),
  collegeId: ObjectIdSchema,
  driveId: ObjectIdSchema,
  recipientType: NotificationRecipientTypeEnum,
  applicationId: ObjectIdSchema.optional(),
  channel: NotificationChannelEnum,
  status: NotificationStatusEnum,
  errorMessage: z.string().optional(),
  sentAt: z.date().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

export type Notification = z.infer<typeof NotificationSchema>;
