import { z } from 'zod';
import { ObjectIdSchema } from './college.schema';
import { RoleEnum } from '../types/enums';

export const UserSchema = z.object({
  _id: ObjectIdSchema.optional(),
  collegeId: ObjectIdSchema.optional(),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  passwordHash: z.string().optional(),
  role: RoleEnum,
  driveId: ObjectIdSchema.optional(),
  roomId: ObjectIdSchema.optional(),
  isActive: z.boolean().default(true),
  refreshToken: z.string().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

export type User = z.infer<typeof UserSchema>;
