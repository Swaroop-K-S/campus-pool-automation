import { Router } from 'express';
import { getDrives, createDrive, getDriveById, updateDrive, activateDrive } from '../controllers/drive.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role-guard.middleware';

const router = Router();

router.use(authenticate);

// List and Create (college_admin only)
router.route('/')
  .get(requireRole(['college_admin']), getDrives)
  .post(requireRole(['college_admin']), createDrive);

// Detail operations
router.route('/:driveId')
  .get(requireRole(['college_admin', 'company_hr']), getDriveById)
  .put(requireRole(['college_admin']), updateDrive);

router.patch('/:driveId/activate', requireRole(['college_admin']), activateDrive);

export default router;
