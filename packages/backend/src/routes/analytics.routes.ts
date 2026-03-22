import { Router } from 'express';
import { getDashboardStats } from '../controllers/analytics.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role-guard.middleware';

const router = Router();

router.use(authenticate);
router.use(requireRole(['college_admin']));

router.get('/dashboard', getDashboardStats);

export default router;
