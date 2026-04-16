import { Router } from 'express';
import { getProfile, updateProfile, updateSmtp, updateTwilio, getTemplates, saveTemplate, deleteTemplate } from '../controllers/college.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.put('/smtp', updateSmtp);
router.put('/twilio', updateTwilio);

// Drive Templates
router.get('/templates', getTemplates);
router.post('/templates', saveTemplate);
router.delete('/templates/:templateId', deleteTemplate);

export default router;
