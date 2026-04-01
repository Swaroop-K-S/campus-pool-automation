import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.middleware';
import { updateEventSetup, getEventSetup, createRoom, getRooms, getRoomWithStudents, updateRoom, deleteRoom, activateRound, completeRound, startEventDay, advanceRound, advancePresentStudents } from '../controllers/event.controller';

const router = Router({ mergeParams: true });
const upload = multer({ storage: multer.memoryStorage() });

router.use(authenticate);

router.post('/event-setup', updateEventSetup);
router.get('/event-setup', getEventSetup);

router.post('/rooms', createRoom);
router.get('/rooms', getRooms);
router.get('/rooms/:roomId', getRoomWithStudents);
router.put('/rooms/:roomId', updateRoom);
router.delete('/rooms/:roomId', deleteRoom);

router.put('/rounds/:roundType/activate', activateRound);
router.put('/rounds/:roundType/complete', completeRound);
router.post('/rounds/:roundType/advance', upload.single('file'), advanceRound);
router.post('/rounds/:roundType/advance-present', advancePresentStudents);
router.patch('/start-event', startEventDay);

export default router;
