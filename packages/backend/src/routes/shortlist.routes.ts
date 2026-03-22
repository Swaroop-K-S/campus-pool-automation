import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role-guard.middleware';
import { uploadShortlist, getShortlisted, massNotify, singleNotify, exportApplications } from '../controllers/shortlist.controller';
import { RoleEnum } from '@campuspool/shared';

const router = Router({ mergeParams: true });
const upload = multer({ storage: multer.memoryStorage() }); // RAM storage for parsing

router.use(authenticate);

// All routes here should be under /drives/:driveId prefix, mounted in index.ts
router.post('/shortlist/upload', requireRole([RoleEnum.enum.college_admin]), upload.single('file'), uploadShortlist);
router.get('/shortlisted', requireRole([RoleEnum.enum.college_admin, RoleEnum.enum.company_hr]), getShortlisted);
router.post('/notify/mass', requireRole([RoleEnum.enum.college_admin]), massNotify);
router.post('/notify/:appId', requireRole([RoleEnum.enum.college_admin]), singleNotify);

router.get('/export/applications', requireRole([RoleEnum.enum.college_admin, RoleEnum.enum.company_hr]), exportApplications);
router.get('/export/shortlisted', requireRole([RoleEnum.enum.college_admin, RoleEnum.enum.company_hr]), exportApplications);

export default router;
