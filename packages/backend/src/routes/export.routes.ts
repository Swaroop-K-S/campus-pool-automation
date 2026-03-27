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

// Drive-specific exports
router.get('/drives/:driveId/export/applications', authenticate, exportApplications);
router.post('/drives/:driveId/export/applications/custom', authenticate, exportCustomColumns);
router.get('/drives/:driveId/export/shortlisted', authenticate, exportShortlisted);
router.get('/drives/:driveId/export/attended', authenticate, exportAttended);
router.get('/drives/:driveId/export/round/:roundType', authenticate, exportRoundStudents);
router.get('/drives/:driveId/export/selected', authenticate, exportSelected);

// Analytics export
router.get('/analytics/export/summary', authenticate, exportAnalyticsSummary);

export default router;
