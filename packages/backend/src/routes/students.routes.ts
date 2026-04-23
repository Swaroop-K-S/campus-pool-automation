import { Router } from 'express';
import { getStudentWatchlist, getAllStudents, updateStudentStrikes, clearStudentStrikes, uploadResume } from '../controllers/students.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorizeRoles } from '../middleware/rbac.middleware';
import { uploadSingleResume } from '../middleware/upload.middleware';

const router = Router();

router.use(authenticate);
router.use(authorizeRoles('admin', 'superadmin'));

router.get('/watchlist', getStudentWatchlist);
router.get('/', getAllStudents);
router.patch('/:usn/strikes', updateStudentStrikes);
router.post('/:usn/strikes/clear', clearStudentStrikes);
router.post('/:usn/resume', uploadSingleResume, uploadResume);

export default router;
