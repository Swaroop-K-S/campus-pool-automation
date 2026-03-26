import { Router } from 'express';
import { importProfile } from '../controllers/sso.controller';

const router = Router();

// Endpoint for fetching user profile from external SSO by unique ID
router.get('/profile/:ssoId', importProfile);

export default router;
