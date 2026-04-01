import { Router } from 'express';
import { startQR, stopQR, verifyStudent, getWelcomeData, getDriveInfo, pushSubscribe, getCurrentQR, getStatusLookup } from '../controllers/qr.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Public endpoints (no auth)
router.get('/:driveId/info', getDriveInfo);
router.get('/:driveId/qr/current', getCurrentQR);
router.post('/:driveId/verify', verifyStudent);
router.get('/:driveId/status-lookup', getStatusLookup);

// Session token auth (student)
router.get('/:driveId/welcome/:appId', getWelcomeData);
router.post('/:driveId/push-subscribe', pushSubscribe);

// Admin only (authenticated)
router.post('/:driveId/qr/start', authenticate, startQR);
router.post('/:driveId/qr/stop', authenticate, stopQR);

export default router;
