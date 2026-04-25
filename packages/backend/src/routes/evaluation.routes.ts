import express from 'express';
import { generateMagicLink, getDashboard, evaluateStudent } from '../controllers/evaluation.controller';
import { authenticate } from '../middleware/auth.middleware';
import { magicLinkAuth } from '../middleware/magic-link.middleware';

const router = express.Router();

// Admin Route to generate the magic link
router.post('/rooms/:roomId/magic-link', authenticate, generateMagicLink);

// Invigilator Routes (protected by magic link middleware)
router.get('/dashboard', magicLinkAuth, getDashboard);
router.post('/student/:appId/evaluate', magicLinkAuth, evaluateStudent);

export default router;
