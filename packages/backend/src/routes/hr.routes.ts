import express from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getHRDashboard, getHRStudents, uploadHRRoundResults, getHRRooms, hrUpload, createHRAccount } from '../controllers/hr.controller';

const router = express.Router();

// Admin route — Create company HR account (any authenticated admin)
router.post('/create-account', authenticate, (req: any, res: any, next: any) => {
  if (!['admin', 'superadmin'].includes(req.user?.role)) {
    return res.status(403).json({ success: false, error: 'Admins only' });
  }
  next();
}, createHRAccount);

// All HR routes require authentication and company_hr role
const hrAuth = [authenticate, (req: any, res: any, next: any) => {
  if (req.user?.role !== 'company_hr') {
    return res.status(403).json({ success: false, error: 'Access denied: Company HR only' });
  }
  next();
}];

router.get('/dashboard', hrAuth, getHRDashboard);
router.get('/students', hrAuth, getHRStudents);
router.get('/rooms', hrAuth, getHRRooms);
router.post('/rounds/:roundType/results', hrAuth, hrUpload.single('file'), uploadHRRoundResults);

export default router;
