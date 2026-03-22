import { Router } from 'express';
import { getDrives, createDrive } from '../controllers/drive.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role-guard.middleware';

const router = Router();

router.use(authenticate);
router.use(requireRole(['college_admin']));

router.route('/')
  .get(getDrives)
  .post(createDrive);

export default router;
