import multer from 'multer';
import { Request } from 'express';

const storage = multer.memoryStorage();

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.fieldname === 'resume') {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF allowed for resume'));
  } else if (file.fieldname === 'photo') {
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') cb(null, true);
    else cb(new Error('Only JPG/PNG allowed for photo'));
  } else {
    cb(null, true);
  }
};

export const uploadApplicationFiles = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
}).fields([
  { name: 'resume', maxCount: 1 },
  { name: 'photo', maxCount: 1 }
]);

export const uploadSingleResume = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
}).single('resume');
