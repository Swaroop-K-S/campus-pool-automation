import { Router } from 'express';
import {
  upsertFormFields,
  getFormFields,
  getPublicFormConfig,
  submitApplication
} from '../controllers/form.controller';
import { authenticate } from '../middleware/auth.middleware';
import { uploadApplicationFiles } from '../middleware/upload.middleware';

const router = Router();

// --- Admin Routes (authenticated) ---
router.post('/drives/:driveId/form', authenticate, upsertFormFields);
router.get('/drives/:driveId/form', authenticate, getFormFields);

// --- Public Routes (no auth) ---
router.get('/form/:formToken', getPublicFormConfig);
router.post('/form/:formToken/submit', uploadApplicationFiles, submitApplication);

export default router;
