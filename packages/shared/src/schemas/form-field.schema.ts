import { z } from 'zod';
import { ObjectIdSchema } from './college.schema';
import { FormFieldTypeEnum } from '../types/enums';

export const FormFieldDefinitionSchema = z.object({
  id: z.string().uuid(),
  type: FormFieldTypeEnum,
  label: z.string().min(1),
  placeholder: z.string().optional(),
  required: z.boolean(),
  options: z.array(z.string()).optional(),
  validation: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
    pattern: z.string().optional(),
    minLength: z.number().optional(),
    maxLength: z.number().optional()
  }).optional(),
  order: z.number()
});

export const FormFieldSchema = z.object({
  _id: ObjectIdSchema.optional(),
  driveId: ObjectIdSchema,
  collegeId: ObjectIdSchema,
  fields: z.array(FormFieldDefinitionSchema),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

export type FormFieldDefinition = z.infer<typeof FormFieldDefinitionSchema>;
export type FormField = z.infer<typeof FormFieldSchema>;
