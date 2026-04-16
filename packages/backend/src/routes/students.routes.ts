import { Router } from 'express';
import { getStudentWatchlist, getAllStudents, updateStudentStrikes, clearStudentStrikes } from '../controllers/students.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorizeRoles } from '../middleware/rbac.middleware';

const router = Router();

router.use(authenticate);
router.use(authorizeRoles('admin', 'superadmin'));

router.get('/watchlist', getStudentWatchlist);
router.get('/', getAllStudents);
router.patch('/:usn/strikes', updateStudentStrikes);
router.post('/:usn/strikes/clear', clearStudentStrikes);

export default router;
