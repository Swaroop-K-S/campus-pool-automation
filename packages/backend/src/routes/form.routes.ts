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

import rateLimit from 'express-rate-limit';

const submitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 5, // Limit each IP to 5 submissions per window
  message: { success: false, message: 'Too many submissions from this IP, please try again after an hour' }
});

// --- Admin Routes (authenticated) ---
router.post('/drives/:driveId/form', authenticate, upsertFormFields);
router.get('/drives/:driveId/form', authenticate, getFormFields);

// --- Public Routes (no auth) ---
router.get('/form/:formToken', getPublicFormConfig);
router.post('/form/:formToken/submit', submitLimiter, uploadApplicationFiles, submitApplication);

export default router;
