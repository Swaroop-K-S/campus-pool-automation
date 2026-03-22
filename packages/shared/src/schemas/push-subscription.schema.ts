import { z } from 'zod';
import { ObjectIdSchema } from './college.schema';

export const PushSubscriptionSchema = z.object({
  _id: ObjectIdSchema.optional(),
  applicationId: ObjectIdSchema,
  driveId: ObjectIdSchema,
  subscription: z.object({
    endpoint: z.string().url(),
    keys: z.object({
      p256dh: z.string(),
      auth: z.string()
    })
  }),
  createdAt: z.date().optional()
});

export type PushSubscription = z.infer<typeof PushSubscriptionSchema>;
