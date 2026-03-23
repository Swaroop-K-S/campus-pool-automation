import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.middleware';
import {
  autoAssign, aiSuggest, confirmAssignments, getAssignments,
  uploadRoundResults, getRoundStudents, exportRoundStudents,
  finalSelection, getSelectedStudents
} from '../controllers/assignment.controller';

const upload = multer({ storage: multer.memoryStorage() });
const router = Router({ mergeParams: true });

router.use(authenticate);

// Room Assignment
router.post('/rooms/auto-assign/:roundType', autoAssign);
router.post('/rooms/ai-suggest/:roundType', aiSuggest);
router.post('/rooms/confirm-assignments', confirmAssignments);
router.get('/rooms/:roundType/assignments', getAssignments);

// Round Progression
router.post('/rounds/:roundType/results', upload.single('file'), uploadRoundResults);
router.get('/rounds/:roundType/students', getRoundStudents);
router.get('/rounds/:roundType/export', exportRoundStudents);

// Final Selection
router.post('/final-selection', upload.single('file'), finalSelection);
router.get('/selected', getSelectedStudents);

export default router;
