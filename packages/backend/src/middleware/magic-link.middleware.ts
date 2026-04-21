import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { RoomModel } from '../models';

export const magicLinkAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(401).json({ success: false, error: 'No token provided' });
      return;
    }
    
    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as any;
    
    // We expect { roomId, email, driveId, round, role: 'invigilator' }
    if (decoded.role !== 'invigilator') {
       res.status(403).json({ success: false, error: 'Invalid token role' });
       return;
    }

    const room = await RoomModel.findById(decoded.roomId).lean();
    if (!room) {
      res.status(404).json({ success: false, error: 'Room no longer exists' });
      return;
    }
    
    // Check revocation: Verify email is still assigned to this room's panel
    const matchesEmail = room.panelists?.some((p: any) => p.email === decoded.email);
    if (!matchesEmail) {
      res.status(403).json({ success: false, error: 'HR Panelist access revoked from this room.' });
      return;
    }
    
    // Inject into request for controllers
    (req as any).invigilatorPayload = decoded;
    
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({ success: false, error: 'Magic link has expired. Please request a new one.' });
    } else {
      res.status(401).json({ success: false, error: 'Invalid token' });
    }
  }
};
