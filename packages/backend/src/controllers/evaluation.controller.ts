import { Request, Response } from 'express';
import { EvaluationService } from '../services/evaluation.service';
import { RoomModel } from '../models';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export const generateMagicLink = async (req: Request, res: Response): Promise<void> => {
  try {
    const { roomId } = req.params;
    const { panelistEmail } = req.body;
    
    if (!panelistEmail) { res.status(400).json({ success: false, error: 'panelistEmail is required' }); return; }

    const room = await RoomModel.findById(roomId);
    if (!room) { res.status(404).json({ success: false, error: 'Room not found' }); return; }

    const isPanelist = room.panelists?.some(p => p.email === panelistEmail);
    if (!isPanelist) { res.status(400).json({ success: false, error: 'Email is not assigned to this room panel' }); return; }

    const payload = { roomId: room._id, driveId: room.driveId, round: room.round, email: panelistEmail, role: 'invigilator' };
    const token = jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: '24h' });
    const url = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/invigilator/${token}`;

    res.json({ success: true, data: { url, token } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getDashboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const payload = (req as any).invigilatorPayload;
    const data = await EvaluationService.getDashboardData(payload);
    res.json({ success: true, data });
  } catch (error: any) {
    if (error.name === 'TokenExpiredError' || error.message.includes('token')) {
      res.status(401).json({ success: false, error: 'Magic link expired or invalid.' });
    } else {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

export const evaluateStudent = async (req: Request, res: Response): Promise<void> => {
  try {
    const payload = (req as any).invigilatorPayload;
    const { appId } = req.params;
    const data = await EvaluationService.evaluateStudent(payload, appId, req.body);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(error.message.includes('suspended') ? 423 : 500).json({ success: false, error: error.message });
  }
};
