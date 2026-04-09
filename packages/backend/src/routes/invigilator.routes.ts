import express from 'express';
import { generateMagicLink, getDashboard, evaluateStudent } from '../controllers/invigilator.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = express.Router();

// Admin Route to generate the magic link
router.get('/rooms/:roomId/magic-link', authenticate, generateMagicLink);

// Invigilator Routes (protected by JWT Payload extracted inside the controller)
router.get('/dashboard', getDashboard);
router.post('/student/:appId/evaluate', evaluateStudent);

export default router;
