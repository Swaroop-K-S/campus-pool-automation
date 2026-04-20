import { Router } from 'express';
import { getDrives, createDrive, getDriveById, updateDrive, activateDrive, cloneDrive, archiveDrive, scheduleForm, extendForm, closeForm, reopenForm, deleteDrive, startEventDay, markCompleted, updateSettings, toggleDrivePause, purgeNoShows, getAuditLogs, checkConflict, matchCandidates, getDriveFunnel } from '../controllers/drive.controller';
import { generateNOC, generateOfferLetter } from '../controllers/noc.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorizeRoles } from '../middleware/rbac.middleware';
import shortlistRoutes from './shortlist.routes';
import eventRoutes from './event.routes';
import assignmentRoutes from './assignment.routes';

const router = Router();

router.use(authenticate);

router.route('/')
  .get(getDrives)
  .post(authorizeRoles('admin', 'superadmin'), createDrive);

router.get('/schedule/check-conflict', authorizeRoles('admin', 'superadmin'), checkConflict);

router.route('/:driveId')
  .get(getDriveById)
  .put(authorizeRoles('admin', 'superadmin'), updateDrive)
  .delete(authorizeRoles('admin', 'superadmin'), deleteDrive);

router.patch('/:driveId/activate', authorizeRoles('admin', 'superadmin'), activateDrive);
router.post('/:driveId/clone', authorizeRoles('admin', 'superadmin'), cloneDrive);
router.get('/:driveId/archive', authorizeRoles('admin', 'superadmin'), archiveDrive); // Added this line
router.patch('/:driveId/start-event', authorizeRoles('admin', 'superadmin'), startEventDay);
router.patch('/:driveId/complete', authorizeRoles('admin', 'superadmin'), markCompleted);
router.patch('/:driveId/settings', authorizeRoles('admin', 'superadmin'), updateSettings);
router.patch('/:driveId/pause', authorizeRoles('admin', 'superadmin'), toggleDrivePause);
router.post('/:driveId/purge-noshows', authorizeRoles('admin', 'superadmin'), purgeNoShows);
router.get('/:driveId/audit-logs', authorizeRoles('admin', 'superadmin'), getAuditLogs);
router.get('/:driveId/noc/:appId', authorizeRoles('admin', 'superadmin'), generateNOC);
router.get('/:driveId/offer/:appId', authorizeRoles('admin', 'superadmin'), generateOfferLetter);
router.get('/:driveId/match', authorizeRoles('admin', 'superadmin'), matchCandidates);
router.get('/:driveId/funnel', authorizeRoles('admin', 'superadmin'), getDriveFunnel);

// The original file had a duplicate import for these, consolidating them into the first import.
// import { scheduleForm, extendForm, closeForm, reopenForm, deleteDrive, startEventDay, markCompleted } from '../controllers/drive.controller';
router.patch('/:driveId/form/schedule', authorizeRoles('admin', 'superadmin'), scheduleForm);
router.patch('/:driveId/form/extend', authorizeRoles('admin', 'superadmin'), extendForm);
router.patch('/:driveId/form/close', authorizeRoles('admin', 'superadmin'), closeForm);
router.patch('/:driveId/form/reopen', authorizeRoles('admin', 'superadmin'), reopenForm);

router.use('/:driveId', shortlistRoutes);
router.use('/:driveId', eventRoutes);
router.use('/:driveId', assignmentRoutes);

export default router;
