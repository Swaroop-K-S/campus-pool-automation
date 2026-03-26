import { z } from 'zod';
import { ObjectIdSchema } from './college.schema';
import { DriveStatusEnum, RoundStatusEnum, RoundTypeEnum } from '../types/enums';

export const DriveSchema = z.object({
  _id: ObjectIdSchema.optional(),
  collegeId: ObjectIdSchema.optional(),
  companyName: z.string().min(1, "Company name is required"),
  jobRole: z.string().min(1, "Job role is required"),
  ctc: z.string().min(1, "CTC is required"),
  locations: z.array(z.string()).min(1, "At least one location is required"),
  eligibility: z.object({
    minCGPA: z.number().min(0).max(10),
    branches: z.array(z.string()).min(1),
    tenth: z.object({
      required: z.boolean(),
      minPercentage: z.number().min(0).max(100)
    }).optional(),
    twelfth: z.object({
      required: z.boolean(),
      minPercentage: z.number().min(0).max(100)
    }).optional(),
    diploma: z.object({
      required: z.boolean(),
      minCGPA: z.number().min(0).max(10)
    }).optional()
  }),
  rounds: z.array(z.object({
    type: z.string(),
    label: z.string().optional(),
    order: z.number(),
    status: z.enum(['pending', 'active', 'completed']).default("pending"),
    isCustom: z.boolean().default(false)
  })),
  formToken: z.string().optional(),
  status: DriveStatusEnum.default("draft"),
  eventDate: z.string().or(z.date()).optional(),
  formOpenDate: z.string().or(z.date()).nullable().optional(),
  formCloseDate: z.string().or(z.date()).nullable().optional(),
  formStatus: z.enum(['not_configured', 'scheduled', 'open', 'closed', 'extended']).default('not_configured'),
  formExtensions: z.array(z.object({
    extendedBy: z.string(),
    previousCloseDate: z.string().or(z.date()).nullable(),
    newCloseDate: z.string().or(z.date()),
    reason: z.string(),
    extendedAt: z.string().or(z.date())
  })).optional(),
  venueDetails: z.object({
    hallName: z.string(),
    capacity: z.number()
  }).optional(),
  schedule: z.array(z.object({
    roundType: z.string(),
    startTime: z.string(),
    duration: z.number()
  })).optional(),
  tags: z.array(z.string()).optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

export type Drive = z.infer<typeof DriveSchema>;
