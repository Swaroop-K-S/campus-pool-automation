import mongoose, { Schema, Document } from 'mongoose';
import { Room } from '@campuspool/shared';

const roomSchema = new Schema({
  driveId: { type: Schema.Types.ObjectId, ref: 'Drive', required: true },
  collegeId: { type: Schema.Types.ObjectId, ref: 'College', required: true },
  round: { type: String, required: true },
  name: { type: String, required: true },
  floor: { type: String },                               // optional — kept for legacy
  location: { type: String },                            // human-readable location info
  sourceRoomId: { type: String },                        // ref to campusRooms[].id in College
  capacity: { type: Number, required: true },
  isLocked: { type: Boolean, default: false },           // Room lock — blocks new assignments
  allowedBranches: [{ type: String }],                   // [] = allow all
  panelists: [{
    name: { type: String, required: true },
    expertise: [{ type: String }]
  }],
  assignedStudents: [{ type: Schema.Types.ObjectId, ref: 'Application' }],
  throughputLog: [{
    recordedAt: { type: Date, default: Date.now },
    processedCount: { type: Number, default: 0 }         // how many evaluated in this window
  }]
}, {
  timestamps: true
});

roomSchema.index({ driveId: 1, round: 1 });
roomSchema.index({ collegeId: 1 });
roomSchema.index({ driveId: 1, isLocked: 1 });

export const RoomModel = mongoose.model<Room & Document>('Room', roomSchema, 'rooms');
