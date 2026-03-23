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
import { uploadApplicationFiles } from '../middleware/upload.middleware';

const router = Router();

// --- Admin Routes (authenticated) ---
router.post('/drives/:driveId/form', authenticate, upsertFormFields);
router.get('/drives/:driveId/form', authenticate, getFormFields);
router.get('/drives/:driveId/applications/:appId/resume', authenticate, streamResume);
router.get('/drives/:driveId/applications/:appId/photo', authenticate, streamPhoto);

// --- Public Routes (no auth) ---
router.get('/form/:formToken', getPublicFormConfig);
router.post('/form/:formToken/submit', uploadApplicationFiles, submitApplication);

export default router;
