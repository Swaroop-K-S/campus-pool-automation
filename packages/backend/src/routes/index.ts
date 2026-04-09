import { Router } from 'express';
import authRoutes from './auth.routes';
import analyticsRoutes from './analytics.routes';
import driveRoutes from './drive.routes';
import platformRoutes from './platform.routes';
import formRoutes from './form.routes';
import qrRoutes from './qr.routes';
import applicationRoutes from './application.routes';
import exportRoutes from './export.routes';
import ssoRoutes from './sso.routes';
import invigilatorRoutes from './invigilator.routes';
import passportRoutes from './passport.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/', exportRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/drives', driveRoutes);
router.use('/platform', platformRoutes);
router.use('/', formRoutes);
router.use('/event', qrRoutes);
router.use('/drives', applicationRoutes);
router.use('/sso', ssoRoutes);
router.use('/invigilator', invigilatorRoutes);
router.use('/passport', passportRoutes);

export default router;
