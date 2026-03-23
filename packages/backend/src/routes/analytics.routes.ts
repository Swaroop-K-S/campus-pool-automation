import { Router } from 'express';
import { getDashboardStats, getFunnel, getBranchDistribution, getDrivesHistory } from '../controllers/analytics.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role-guard.middleware';

const router = Router();

router.use(authenticate);
router.use(requireRole(['college_admin']));

router.get('/dashboard', getDashboardStats);
router.get('/summary', getDashboardStats);
router.get('/funnel/:driveId', getFunnel);
router.get('/branch-distribution', getBranchDistribution);
router.get('/drives-history', getDrivesHistory);

export default router;
