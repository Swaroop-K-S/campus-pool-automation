import { Router } from 'express';
import { z } from 'zod';
import * as authController from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate.middleware';
import { LoginRequestSchema } from '@campuspool/shared';
import { authLimiter } from '../middleware/rate-limit.middleware';
import passport from '../config/passport';
import { env } from '../config/env';
import jwt from 'jsonwebtoken';

const router = Router();

// ── Standard credential login ────────────────────────────────────────────────
router.post(
  '/login',
  authLimiter,
  validateRequest(z.object({ body: LoginRequestSchema })),
  authController.login,
);
router.post('/refresh', authController.refresh);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.getMe);

// ── Google OAuth SSO (stateless — no express-session) ───────────────────────
// Only expose these routes when the Google strategy is configured
if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
  // 1. Initiate redirect to Google consent screen
  router.get(
    '/google',
    passport.authenticate('google', { scope: ['profile', 'email'], session: false }),
  );

  // 2. Google callback — verify user, issue CampusPool cookies, redirect to frontend
  router.get(
    '/google/callback',
    passport.authenticate('google', {
      session: false,
      failureRedirect: `${env.FRONTEND_URL}/login?error=unauthorized`,
    }),
    (req, res) => {
      const user = req.user as any;

      const payload = {
        userId: user._id.toString(),
        collegeId: user.collegeId?.toString(),
        email: user.email,
        role: user.role,
      };

      const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, {
        expiresIn: env.JWT_ACCESS_EXPIRY as any,
      });
      const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, {
        expiresIn: env.JWT_REFRESH_EXPIRY as any,
      });

      // Persist refresh token (mirrors standard login behaviour)
      user.refreshToken = refreshToken;
      user.save().catch((e: unknown) => console.error('[SSO] Failed to save refresh token', e));

      const cookieOpts = {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
      };

      res.cookie('accessToken', accessToken, { ...cookieOpts, maxAge: 15 * 60 * 1000 });
      res.cookie('refreshToken', refreshToken, { ...cookieOpts, maxAge: 7 * 24 * 60 * 60 * 1000 });

      // Redirect to the silent callback page in the frontend
      res.redirect(`${env.FRONTEND_URL}/auth-success`);
    },
  );
}

export default router;
