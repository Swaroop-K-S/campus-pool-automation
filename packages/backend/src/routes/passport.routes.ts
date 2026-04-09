import { Router } from 'express';
import { verifyStudent, getPassportProfile } from '../controllers/passport.controller';

const router = Router();

// POST /passport/verify — USN + email → passport JWT
router.post('/verify', verifyStudent);

// GET /passport/profile — Bearer passport JWT → full cross-drive history
router.get('/profile', getPassportProfile);

export default router;
