import { Router } from 'express';
import { getDrives, createDrive, getDriveById, updateDrive, activateDrive } from '../controllers/drive.controller';
import { authenticate } from '../middleware/auth.middleware';
import shortlistRoutes from './shortlist.routes';
import eventRoutes from './event.routes';
import assignmentRoutes from './assignment.routes';

const router = Router();

router.use(authenticate);

router.route('/')
  .get(getDrives)
  .post(createDrive);

router.route('/:driveId')
  .get(getDriveById)
  .put(updateDrive);

router.patch('/:driveId/activate', activateDrive);

import { scheduleForm, extendForm, closeForm, reopenForm } from '../controllers/drive.controller';
router.patch('/:driveId/form/schedule', scheduleForm);
router.patch('/:driveId/form/extend', extendForm);
router.patch('/:driveId/form/close', closeForm);
router.patch('/:driveId/form/reopen', reopenForm);

router.use('/:driveId', shortlistRoutes);
router.use('/:driveId', eventRoutes);
router.use('/:driveId', assignmentRoutes);

export default router;
