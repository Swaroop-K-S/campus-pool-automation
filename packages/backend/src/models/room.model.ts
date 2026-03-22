import mongoose, { Schema, Document } from 'mongoose';
import { Room } from '@campuspool/shared';

const roomSchema = new Schema({
  driveId: { type: Schema.Types.ObjectId, ref: 'Drive', required: true },
  collegeId: { type: Schema.Types.ObjectId, ref: 'College', required: true },
  round: { type: String, required: true },
  name: { type: String, required: true },
  floor: { type: String, required: true },
  capacity: { type: Number, required: true },
  panelists: [{
    name: { type: String, required: true },
    expertise: [{ type: String }]
  }],
  assignedStudents: [{ type: Schema.Types.ObjectId, ref: 'Application' }]
}, {
  timestamps: true
});

roomSchema.index({ driveId: 1, round: 1 });
roomSchema.index({ collegeId: 1 });

export const RoomModel = mongoose.model<Room & Document>('Room', roomSchema, 'rooms');
