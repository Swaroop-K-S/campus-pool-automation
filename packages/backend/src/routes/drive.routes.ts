import { Router } from 'express';
import { getDrives, createDrive, getDriveById, updateDrive, activateDrive, cloneDrive, archiveDrive, scheduleForm, extendForm, closeForm, reopenForm, deleteDrive, startEventDay, markCompleted } from '../controllers/drive.controller';
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
  .put(updateDrive)
  .delete(deleteDrive);

router.patch('/:driveId/activate', activateDrive);
router.post('/:driveId/clone', cloneDrive);
router.get('/:driveId/archive', archiveDrive); // Added this line
router.patch('/:driveId/start-event', startEventDay);
router.patch('/:driveId/complete', markCompleted);

// The original file had a duplicate import for these, consolidating them into the first import.
// import { scheduleForm, extendForm, closeForm, reopenForm, deleteDrive, startEventDay, markCompleted } from '../controllers/drive.controller';
router.patch('/:driveId/form/schedule', scheduleForm);
router.patch('/:driveId/form/extend', extendForm);
router.patch('/:driveId/form/close', closeForm);
router.patch('/:driveId/form/reopen', reopenForm);

router.use('/:driveId', shortlistRoutes);
router.use('/:driveId', eventRoutes);
router.use('/:driveId', assignmentRoutes);

export default router;
