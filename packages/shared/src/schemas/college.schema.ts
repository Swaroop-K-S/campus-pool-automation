import { z } from 'zod';

export const ObjectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId");

export const CollegeSchema = z.object({
  _id: ObjectIdSchema.optional(),
  name: z.string().min(1, "College name is required"),
  address: z.string().min(1, "Address is required"),
  logo: z.string().optional(),
  smtpConfig: z.object({
    host: z.string(),
    port: z.number(),
    user: z.string(),
    pass: z.string()
  }).optional(),
  twilioConfig: z.object({
    accountSid: z.string(),
    authToken: z.string(),
    fromNumber: z.string()
  }).optional(),
  vapidPublicKey: z.string().optional(),
  vapidPrivateKey: z.string().optional(),
  campusRooms: z.array(z.object({
    id: z.string(),
    name: z.string(),
    capacity: z.number(),
    location: z.string().optional()
  })).optional(),
  isActive: z.boolean().default(true),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

export type College = z.infer<typeof CollegeSchema>;
