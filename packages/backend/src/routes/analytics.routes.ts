import { Router } from 'express';
import { getDashboardStats, getFunnel, getBranchDistribution, getDrivesHistory } from '../controllers/analytics.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/dashboard', getDashboardStats);
router.get('/summary', getDashboardStats);
router.get('/funnel/:driveId', getFunnel);
router.get('/branch-distribution', getBranchDistribution);
router.get('/drives-history', getDrivesHistory);

export default router;
