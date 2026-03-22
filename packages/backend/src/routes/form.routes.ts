import { Router } from 'express';
import { 
  upsertFormFields, 
  getFormFields, 
  getPublicFormConfig, 
  submitApplication,
  streamResume,
  streamPhoto
} from '../controllers/form.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role-guard.middleware';
import { uploadApplicationFiles } from '../middleware/upload.middleware';

const router = Router();

// --- College Admin Routes ---
router.post('/drives/:driveId/form', authenticate, requireRole(['college_admin']), upsertFormFields);
router.get('/drives/:driveId/form', authenticate, requireRole(['college_admin']), getFormFields);
router.get('/drives/:driveId/applications/:appId/resume', authenticate, requireRole(['college_admin']), streamResume);
router.get('/drives/:driveId/applications/:appId/photo', authenticate, requireRole(['college_admin']), streamPhoto);

// --- Public Routes ---
router.get('/form/:formToken', getPublicFormConfig);
router.post('/form/:formToken/submit', uploadApplicationFiles, submitApplication);

export default router;
