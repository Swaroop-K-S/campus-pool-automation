import { Router } from 'express';
import {
  getApplications,
  getApplicationById,
  getApplicationStats,
  updateApplicationStatus,
  updateApplicationData,
  addManualCandidate
} from '../controllers/application.controller';
import { streamResume, streamPhoto } from '../controllers/form.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All these routes need authentication
router.use(authenticate);

// We'll organize them assuming this router is mounted at /api/v1/drives
router.get('/:driveId/applications', getApplications);
router.get('/:driveId/applications/stats', getApplicationStats); // Must come before /:appId
router.post('/:driveId/applications/manual', addManualCandidate); // Must come before /:appId
router.get('/:driveId/applications/:appId', getApplicationById);
router.get('/:driveId/applications/:appId/resume', streamResume);
router.get('/:driveId/applications/:appId/photo', streamPhoto);
router.patch('/:driveId/applications/:appId/status', updateApplicationStatus);
router.put('/:driveId/applications/:appId', updateApplicationData);

export default router;
