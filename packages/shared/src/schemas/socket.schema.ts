import { z } from 'zod';

export const SosEventSchema = z.object({
  applicationId: z.string().min(1, "applicationId is required"),
  driveId: z.string().min(1, "driveId is required"),
  studentName: z.string().min(1, "studentName is required"),
  room: z.string().min(1, "room is required"),
  triageCategory: z.string().min(1, "triageCategory is required")
}).strict(); // Enforce strict matching to drop unverified properties

export const JoinDriveSchema = z.string().min(1).max(200);
export const JoinAppSchema = z.string().min(1).max(200);
export const JoinDriveQrSchema = z.string().min(1).max(200);

export const DispatchRequestSchema = z.object({
  roomId: z.string().min(1, "roomId is required"),
  driveId: z.string().min(1, "driveId is required"),
  hrEmail: z.string().email("Valid email is required"),
  requestType: z.enum(['technical', 'refreshment', 'stationery', 'other'])
}).strict();
