import { Router } from 'express';
import { getDashboardStats, getFunnel, getBranchDistribution, getDrivesHistory, getSelectedStudents, getRecentActivity } from '../controllers/analytics.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/dashboard', getDashboardStats);
router.get('/summary', getDashboardStats);
router.get('/funnel/:driveId', getFunnel);
router.get('/branch-distribution', getBranchDistribution);
router.get('/drives-history', getDrivesHistory);
router.get('/selected-students', getSelectedStudents);
router.get('/recent-activity', getRecentActivity);

export default router;
