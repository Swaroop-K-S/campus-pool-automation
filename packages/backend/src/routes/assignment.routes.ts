import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role-guard.middleware';
import { RoleEnum } from '@campuspool/shared';
import {
  autoAssign, aiSuggest, confirmAssignments, getAssignments,
  uploadRoundResults, getRoundStudents, exportRoundStudents,
  finalSelection, getSelectedStudents
} from '../controllers/assignment.controller';

const upload = multer({ storage: multer.memoryStorage() });
const router = Router({ mergeParams: true });

router.use(authenticate);

// Room Assignment
router.post('/rooms/auto-assign/:roundType', requireRole([RoleEnum.enum.college_admin]), autoAssign);
router.post('/rooms/ai-suggest/:roundType', requireRole([RoleEnum.enum.college_admin]), aiSuggest);
router.post('/rooms/confirm-assignments', requireRole([RoleEnum.enum.college_admin]), confirmAssignments);
router.get('/rooms/:roundType/assignments', requireRole([RoleEnum.enum.college_admin, RoleEnum.enum.company_hr, RoleEnum.enum.invigilator]), getAssignments);

// Round Progression
router.post('/rounds/:roundType/results', requireRole([RoleEnum.enum.college_admin, RoleEnum.enum.company_hr]), upload.single('file'), uploadRoundResults);
router.get('/rounds/:roundType/students', requireRole([RoleEnum.enum.college_admin, RoleEnum.enum.company_hr]), getRoundStudents);
router.get('/rounds/:roundType/export', requireRole([RoleEnum.enum.college_admin]), exportRoundStudents);

// Final Selection
router.post('/final-selection', requireRole([RoleEnum.enum.college_admin]), upload.single('file'), finalSelection);
router.get('/selected', requireRole([RoleEnum.enum.college_admin]), getSelectedStudents);

export default router;
