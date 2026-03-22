import { z } from 'zod';
import { ObjectIdSchema } from './college.schema';
import { ApplicationStatusEnum } from '../types/enums';

export const ApplicationSchema = z.object({
  _id: ObjectIdSchema.optional(),
  referenceNumber: z.string().optional(),
  driveId: ObjectIdSchema,
  collegeId: ObjectIdSchema,
  data: z.record(z.any()), // Dynamic object
  resumeFileId: ObjectIdSchema.optional(),
  photoFileId: ObjectIdSchema.optional(),
  status: ApplicationStatusEnum.default("applied"),
  currentRound: z.string().optional(),
  attendedAt: z.date().optional(),
  submittedAt: z.date().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  isSelected: z.boolean().optional() // Computed virtual
});

export type Application = z.infer<typeof ApplicationSchema>;
