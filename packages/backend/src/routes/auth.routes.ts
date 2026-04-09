import { Router } from 'express';
import { z } from 'zod';
import * as authController from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate.middleware';
import { LoginRequestSchema } from '@campuspool/shared';
import { authLimiter } from '../middleware/rate-limit.middleware';

const router = Router();

router.post('/login', authLimiter, validateRequest(z.object({ body: LoginRequestSchema })), authController.login);

router.post('/refresh', authController.refresh);

router.post('/logout', authenticate, authController.logout);

router.get('/me', authenticate, authController.getMe);

export default router;
