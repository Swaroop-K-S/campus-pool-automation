import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role-guard.middleware';
import { updateEventSetup, getEventSetup, createRoom, updateRoom, deleteRoom, activateRound } from '../controllers/event.controller';
import { RoleEnum } from '@campuspool/shared';

const router = Router({ mergeParams: true });

router.use(authenticate);

router.post('/event-setup', requireRole([RoleEnum.enum.college_admin]), updateEventSetup);
router.get('/event-setup', requireRole([RoleEnum.enum.college_admin, RoleEnum.enum.company_hr, RoleEnum.enum.invigilator]), getEventSetup);

router.post('/rooms', requireRole([RoleEnum.enum.college_admin]), createRoom);
router.put('/rooms/:roomId', requireRole([RoleEnum.enum.college_admin]), updateRoom);
router.delete('/rooms/:roomId', requireRole([RoleEnum.enum.college_admin]), deleteRoom);

router.put('/rounds/:roundType/activate', requireRole([RoleEnum.enum.college_admin]), activateRound);

export default router;
