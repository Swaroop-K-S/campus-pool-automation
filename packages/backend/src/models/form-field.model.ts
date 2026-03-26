import mongoose, { Schema, Document } from 'mongoose';
import { FormField, FormFieldTypeEnum } from '@campuspool/shared';

const formFieldDefinitionSchema = new Schema({
  id: { type: String, required: true },
  type: { type: String, enum: Object.values(FormFieldTypeEnum.enum), required: true },
  label: { type: String, required: true },
  placeholder: String,
  required: { type: Boolean, default: false },
  locked: { type: Boolean, default: false },
  options: [{ type: String }],
  validation: {
    min: Number,
    max: Number,
    pattern: String,
    customErrorMessage: String,
    minLength: Number,
    maxLength: Number
  },
  order: { type: Number, required: true }
}, { _id: false });

const formFieldSchema = new Schema({
  driveId: { type: Schema.Types.ObjectId, ref: 'Drive', required: true, unique: true },
  collegeId: { type: Schema.Types.ObjectId, ref: 'College', required: true },
  fields: [formFieldDefinitionSchema]
}, {
  timestamps: true
});

formFieldSchema.index({ collegeId: 1 });

export const FormFieldModel = mongoose.model<FormField & Document>('FormField', formFieldSchema, 'formFields');
