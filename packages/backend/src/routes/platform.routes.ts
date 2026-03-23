import { Router } from 'express';
import { getColleges, createCollege } from '../controllers/platform.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.route('/colleges')
  .get(getColleges)
  .post(createCollege);

export default router;
