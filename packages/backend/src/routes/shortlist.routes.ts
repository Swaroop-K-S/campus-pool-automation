import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.middleware';
import { uploadShortlist, getShortlisted, massNotify, singleNotify, exportApplications, bulkNotifyWithTemplate, getAuditLogs } from '../controllers/shortlist.controller';

const router = Router({ mergeParams: true });
const upload = multer({ storage: multer.memoryStorage() });

router.use(authenticate);

router.post('/shortlist/upload', upload.single('file'), uploadShortlist);
router.get('/shortlisted', getShortlisted);
router.post('/notify/mass', massNotify);
router.post('/notify/bulk', bulkNotifyWithTemplate);
router.post('/notify/:appId', singleNotify);

router.get('/audit-logs', getAuditLogs);

router.get('/export/applications', exportApplications);
router.get('/export/shortlisted', exportApplications);

export default router;
