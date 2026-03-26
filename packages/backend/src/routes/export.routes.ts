import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  exportApplications,
  exportShortlisted,
  exportAttended,
  exportRoundStudents,
  exportSelected,
  exportAnalyticsSummary,
  exportCustomColumns
} from '../controllers/export.controller';

const router = Router();

// All export routes require authentication
router.use(authenticate);

// Drive-specific exports
router.get('/drives/:driveId/export/applications', exportApplications);
router.post('/drives/:driveId/export/applications/custom', exportCustomColumns);
router.get('/drives/:driveId/export/shortlisted', exportShortlisted);
router.get('/drives/:driveId/export/attended', exportAttended);
router.get('/drives/:driveId/export/round/:roundType', exportRoundStudents);
router.get('/drives/:driveId/export/selected', exportSelected);

// Analytics export
router.get('/analytics/export/summary', exportAnalyticsSummary);

export default router;
