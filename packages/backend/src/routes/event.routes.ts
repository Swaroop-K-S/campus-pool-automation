import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.middleware';
import { driveGuard } from '../middleware/drive-guard.middleware';
import { authorizeRoles } from '../middleware/rbac.middleware';
import { updateEventSetup, getEventSetup, createRoom, getRooms, getRoomWithStudents, updateRoom, deleteRoom, activateRound, completeRound, startEventDay, advanceRound, advancePresentStudents, updateRoomCapacity, purgeNoShows, walkInRegistration, getProjectorStats, lockRoom, transferStudent, getRoomEWT, rotateRooms } from '../controllers/event.controller';

const router = Router({ mergeParams: true });
const upload = multer({ storage: multer.memoryStorage() });

// Public projector display (no auth)
router.get('/:driveId/projector-stats', getProjectorStats);

router.use(authenticate);

// Protected routes (except GETs which don't mutate state)
router.post('/event-setup', driveGuard, authorizeRoles('admin', 'superadmin'), updateEventSetup);
router.get('/event-setup', getEventSetup);

// Queue Tracking
import { getQueueStatus } from '../controllers/queue.controller';
router.get('/:driveId/queue/:appId', getQueueStatus);

router.post('/rooms', driveGuard, authorizeRoles('admin', 'superadmin'), createRoom);
router.get('/rooms', getRooms);
router.get('/rooms/:roomId', getRoomWithStudents);
router.put('/rooms/:roomId', driveGuard, authorizeRoles('admin', 'superadmin'), updateRoom);
router.delete('/rooms/:roomId', driveGuard, authorizeRoles('admin', 'superadmin'), deleteRoom);
router.patch('/rooms/:roomId/capacity', driveGuard, authorizeRoles('admin', 'superadmin'), updateRoomCapacity);
router.post('/purge-no-shows', driveGuard, authorizeRoles('admin', 'superadmin'), purgeNoShows);

router.patch('/rooms/:roomId/lock', driveGuard, authorizeRoles('admin', 'superadmin'), lockRoom);
router.post('/rooms/:roomId/transfer-student', driveGuard, authorizeRoles('admin', 'superadmin'), transferStudent);
router.get('/rooms/:roomId/ewt', getRoomEWT);

router.post('/rotate-rooms', driveGuard, authorizeRoles('admin', 'superadmin'), rotateRooms);

router.put('/rounds/:roundType/activate', driveGuard, authorizeRoles('admin', 'superadmin'), activateRound);
router.put('/rounds/:roundType/complete', driveGuard, authorizeRoles('admin', 'superadmin'), completeRound);
router.post('/rounds/:roundType/advance', driveGuard, authorizeRoles('admin', 'superadmin'), upload.single('file'), advanceRound);
router.post('/rounds/:roundType/advance-present', driveGuard, authorizeRoles('admin', 'superadmin'), advancePresentStudents);
router.patch('/start-event', driveGuard, authorizeRoles('admin', 'superadmin'), startEventDay);
router.post('/walk-in', driveGuard, authorizeRoles('admin', 'superadmin'), walkInRegistration);



export default router;
