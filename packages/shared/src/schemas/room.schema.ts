import { z } from 'zod';
import { ObjectIdSchema } from './college.schema';

export const RoomSchema = z.object({
  _id: ObjectIdSchema.optional(),
  driveId: ObjectIdSchema,
  collegeId: ObjectIdSchema,
  round: z.string(),
  name: z.string().min(1),
  floor: z.string().optional(),
  location: z.string().optional(),
  capacity: z.number().min(1),
  panelists: z.array(z.object({
    name: z.string(),
    email: z.string().email(),
    expertise: z.array(z.string())
  })),
  assignedStudents: z.array(ObjectIdSchema).optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

export type Room = z.infer<typeof RoomSchema>;
