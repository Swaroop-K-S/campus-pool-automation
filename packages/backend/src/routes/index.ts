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
import evaluationRoutes from './evaluation.routes';
import passportRoutes from './passport.routes';
import hrRoutes from './hr.routes';
import studentsRoutes from './students.routes';
import collegeRoutes from './college.routes';

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
router.use('/invigilator', evaluationRoutes);
router.use('/passport', passportRoutes);
router.use('/hr', hrRoutes);
router.use('/students', studentsRoutes);
router.use('/college', collegeRoutes);

export default router;
