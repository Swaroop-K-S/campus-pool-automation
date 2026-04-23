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
    cgpa: z.object({
      minimum: z.number().min(0).max(10),
      ruleType: z.enum(['strict', 'relaxed', 'info']).default('strict')
    }).optional(),
    branches: z.array(z.string()).min(1),
    tenth: z.object({
      required: z.boolean(),
      minPercentage: z.number().min(0).max(100),
      ruleType: z.enum(['strict', 'relaxed', 'info']).default('strict')
    }).optional(),
    twelfth: z.object({
      required: z.boolean(),
      minPercentage: z.number().min(0).max(100),
      ruleType: z.enum(['strict', 'relaxed', 'info']).default('strict')
    }).optional(),
    diploma: z.object({
      required: z.boolean(),
      minCGPA: z.number().min(0).max(10),
      ruleType: z.enum(['strict', 'relaxed', 'info']).default('strict')
    }).optional(),
    // Unified marks threshold (student picks 12th OR diploma path)
    minTenthMarks:            z.number().min(0).max(100).default(0),
    minTwelfthOrDiplomaMarks: z.number().min(0).max(100).default(0),
    allowActiveBacklogs:      z.boolean().default(false),
    maxBacklogs:              z.number().int().min(0).default(0)
  }),

  // Admin-toggled optional fields shown in the application form
  requestedFields: z.object({
    github:     z.boolean().default(false),
    linkedin:   z.boolean().default(false),
    portfolio:  z.boolean().default(false),
    resumeText: z.boolean().default(false)
  }).optional(),

  // Strict time-lock window enforced server-side
  applicationWindow: z.object({
    startDate:       z.string().or(z.date()),
    endDate:         z.string().or(z.date()),
    extensionReason: z.string().optional()
  }).optional(),
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
  reportTime: z.string().optional(),
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
  rubricSchema: z.array(z.object({
    id: z.string(),
    label: z.string(),
    type: z.enum(['slider', 'radio', 'text']),
    options: z.array(z.string()).optional(),
    maxScore: z.number().optional()
  })).optional(),
  tags: z.array(z.string()).optional(),
  walkInEnabled: z.boolean().default(false),
  resources: z.array(z.object({
    title: z.string(),
    url: z.string()
  })).optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

export type Drive = z.infer<typeof DriveSchema>;
