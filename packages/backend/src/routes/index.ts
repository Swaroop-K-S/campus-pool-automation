import { Router } from 'express';
import authRoutes from './auth.routes';
import analyticsRoutes from './analytics.routes';
import driveRoutes from './drive.routes';
import platformRoutes from './platform.routes';
import formRoutes from './form.routes';
import qrRoutes from './qr.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/drives', driveRoutes);
router.use('/platform', platformRoutes);
router.use('/', formRoutes);
router.use('/event', qrRoutes);

export default router;
