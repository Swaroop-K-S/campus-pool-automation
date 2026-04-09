import { Router } from 'express';
import { startQR, stopQR, verifyStudent, getWelcomeData, getDriveInfo, pushSubscribe, getCurrentQR, getStatusLookup, approveLatecomers, getMIAStudents } from '../controllers/qr.controller';
import { authenticate } from '../middleware/auth.middleware';
import { driveGuard } from '../middleware/drive-guard.middleware';

const router = Router();

// Public endpoints (no auth)
router.get('/:driveId/info', getDriveInfo);
router.get('/:driveId/qr/current', getCurrentQR);
router.post('/:driveId/verify', driveGuard, verifyStudent); // Guarded
router.get('/:driveId/status-lookup', getStatusLookup);

// Session token auth (student)
router.get('/:driveId/welcome/:appId', getWelcomeData);
router.post('/:driveId/push-subscribe', pushSubscribe);

// Admin only (authenticated)
router.post('/:driveId/qr/start', authenticate, driveGuard, startQR);
router.post('/:driveId/qr/stop', authenticate, driveGuard, stopQR);
router.post('/:driveId/latecomer-override', authenticate, approveLatecomers);
router.get('/:driveId/mia-students', authenticate, getMIAStudents);

export default router;
