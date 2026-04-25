import { Request, Response } from 'express';
import { asyncHandler } from '../utils/async-handler';
import { RoomService } from '../services/room.service';

export const createRoom = asyncHandler(async (req: Request, res: Response) => {
  const collegeId = (req as any).user.collegeId;
  const room = await RoomService.createRoom(collegeId, req.params.driveId, req.body);
  res.status(201).json({ success: true, data: room });
});

export const getRooms = asyncHandler(async (req: Request, res: Response) => {
  const rooms = await RoomService.getRoomsByDrive(req.params.driveId);
  res.status(200).json({ success: true, data: rooms });
});

export const getRoomWithStudents = asyncHandler(async (req: Request, res: Response) => {
  const room = await RoomService.getRoomWithStudents(req.params.driveId, req.params.roomId);
  if (!room) {
    res.status(404).json({ success: false, error: 'Room not found' });
    return;
  }
  res.status(200).json({ success: true, data: room });
});

export const updateRoom = asyncHandler(async (req: Request, res: Response) => {
  const room = await RoomService.updateRoom(req.params.driveId, req.params.roomId, req.body);
  if (!room) {
    res.status(404).json({ success: false, error: 'Room not found' });
    return;
  }
  res.status(200).json({ success: true, data: room });
});

export const deleteRoom = asyncHandler(async (req: Request, res: Response) => {
  await RoomService.deleteRoom(req.params.driveId, req.params.roomId);
  res.status(200).json({ success: true, data: { message: 'Room deleted' } });
});
