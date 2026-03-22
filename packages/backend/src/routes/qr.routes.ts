import { Router } from 'express';
import { startQR, stopQR, verifyStudent, getWelcomeData, getDriveInfo, pushSubscribe } from '../controllers/qr.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role-guard.middleware';
import { RoleEnum } from '@campuspool/shared';

const router = Router();

// Public endpoints (no auth)
router.get('/:driveId/info', getDriveInfo);
router.post('/:driveId/verify', verifyStudent);

// Session token auth (student verifies via JWT in header)
router.get('/:driveId/welcome/:appId', getWelcomeData);
router.post('/:driveId/push-subscribe', pushSubscribe);

// Admin only
router.post('/:driveId/qr/start', authenticate, requireRole([RoleEnum.enum.college_admin]), startQR);
router.post('/:driveId/qr/stop', authenticate, requireRole([RoleEnum.enum.college_admin]), stopQR);

export default router;
