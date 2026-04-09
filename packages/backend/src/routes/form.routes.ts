import { Router } from 'express';
import {
  upsertFormFields,
  getFormFields,
  getPublicFormConfig,
  submitApplication,
  getCloudinarySignature
} from '../controllers/form.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

import rateLimit from 'express-rate-limit';

const submitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 5, // Limit each IP to 5 submissions per window
  message: { success: false, message: 'Too many submissions from this IP, please try again after an hour' }
});

import { authorizeRoles } from '../middleware/rbac.middleware';

// --- Admin Routes (authenticated) ---
router.post('/drives/:driveId/form', authenticate, authorizeRoles('admin', 'superadmin'), upsertFormFields);
router.get('/drives/:driveId/form', authenticate, getFormFields);

// --- Public Routes (no auth) ---
// IMPORTANT: Specific routes MUST come before the generic :formToken catch-all
router.get('/form/:formToken/presign', getCloudinarySignature);
router.post('/form/:formToken/submit', submitApplication);
router.get('/form/:formToken', getPublicFormConfig);

export default router;

