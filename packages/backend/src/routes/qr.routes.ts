import { Router } from 'express';
import { startQR, stopQR, verifyStudent, getWelcomeData, getDriveInfo, pushSubscribe } from '../controllers/qr.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Public endpoints (no auth)
router.get('/:driveId/info', getDriveInfo);
router.post('/:driveId/verify', verifyStudent);

// Session token auth (student)
router.get('/:driveId/welcome/:appId', getWelcomeData);
router.post('/:driveId/push-subscribe', pushSubscribe);

// Admin only (authenticated)
router.post('/:driveId/qr/start', authenticate, startQR);
router.post('/:driveId/qr/stop', authenticate, stopQR);

export default router;
