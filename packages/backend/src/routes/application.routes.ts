import { Router } from 'express';
import {
  getApplications,
  getApplicationById,
  getApplicationStats
} from '../controllers/application.controller';
import { streamResume, streamPhoto } from '../controllers/form.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Base path when mounted should be /api/v1/drives/:driveId/applications
// OR if mounted as /api/v1/drives, it should be /:driveId/applications

// All these routes need authentication
router.use(authenticate);

// We'll organize them assuming this router is mounted at /api/v1/drives
router.get('/:driveId/applications', getApplications);
router.get('/:driveId/applications/stats', getApplicationStats); // Must come before /:appId
router.get('/:driveId/applications/:appId', getApplicationById);
router.get('/:driveId/applications/:appId/resume', streamResume);
router.get('/:driveId/applications/:appId/photo', streamPhoto);

export default router;
