import { Router } from 'express';
import { z } from 'zod';
import * as authController from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate.middleware';
import { LoginRequestSchema } from '@campuspool/shared';

const router = Router();

router.post('/login', validateRequest(z.object({ body: LoginRequestSchema })), authController.login);

router.post('/refresh', validateRequest(z.object({
  body: z.object({ refreshToken: z.string() })
})), authController.refresh);

router.post('/logout', authenticate, authController.logout);

router.get('/me', authenticate, authController.getMe);

export default router;
