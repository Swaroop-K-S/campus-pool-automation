import { Router } from 'express';
import { getProfile, updateProfile, updateSmtp, updateTwilio } from '../controllers/college.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.put('/smtp', updateSmtp);
router.put('/twilio', updateTwilio);

export default router;
