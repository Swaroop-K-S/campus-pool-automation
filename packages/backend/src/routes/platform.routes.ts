import { Router } from 'express';
import { getColleges, createCollege } from '../controllers/platform.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role-guard.middleware';

const router = Router();

router.use(authenticate);
router.use(requireRole(['platform_admin']));

router.route('/colleges')
  .get(getColleges)
  .post(createCollege);

export default router;
