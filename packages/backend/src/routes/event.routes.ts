import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { updateEventSetup, getEventSetup, createRoom, getRooms, updateRoom, deleteRoom, activateRound, completeRound, startEventDay } from '../controllers/event.controller';

const router = Router({ mergeParams: true });

router.use(authenticate);

router.post('/event-setup', updateEventSetup);
router.get('/event-setup', getEventSetup);

router.post('/rooms', createRoom);
router.get('/rooms', getRooms);
router.put('/rooms/:roomId', updateRoom);
router.delete('/rooms/:roomId', deleteRoom);

router.put('/rounds/:roundType/activate', activateRound);
router.put('/rounds/:roundType/complete', completeRound);
router.patch('/start-event', startEventDay);

export default router;
