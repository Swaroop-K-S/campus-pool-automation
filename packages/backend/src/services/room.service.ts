import { RoomModel, ApplicationModel } from '../models';
import { Room } from '@campuspool/shared';

export class RoomService {
  static async createRoom(collegeId: string, driveId: string, payload: Partial<Room>) {
    return await RoomModel.create({ ...payload, driveId, collegeId });
  }

  static async getRoomsByDrive(driveId: string) {
    return await RoomModel.find({ driveId }).lean();
  }

  static async getRoomWithStudents(driveId: string, roomId: string) {
    return await RoomModel.findOne({ _id: roomId, driveId })
      .populate('assignedStudents', 'data referenceNumber status')
      .lean();
  }

  static async updateRoom(driveId: string, roomId: string, payload: Partial<Room>) {
    return await RoomModel.findOneAndUpdate(
      { _id: roomId, driveId }, 
      { $set: payload }, 
      { new: true }
    );
  }

  static async deleteRoom(driveId: string, roomId: string) {
    return await RoomModel.findOneAndDelete({ _id: roomId, driveId });
  }
}
