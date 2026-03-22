import { z } from 'zod';
import { ObjectIdSchema } from './college.schema';

export const QRSessionSchema = z.object({
  _id: ObjectIdSchema.optional(),
  driveId: ObjectIdSchema,
  token: z.string(),
  createdAt: z.date().optional(),
  expiresAt: z.date()
});

export type QRSession = z.infer<typeof QRSessionSchema>;
