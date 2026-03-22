import { Router } from 'express';
import authRoutes from './auth.routes';
import analyticsRoutes from './analytics.routes';
import driveRoutes from './drive.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/drives', driveRoutes);

// Other routes will be mounted here in subsequent phases

export default router;
