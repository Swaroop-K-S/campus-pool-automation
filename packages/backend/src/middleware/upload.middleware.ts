import multer from 'multer';
import { GridFsStorage } from 'multer-gridfs-storage';
import { env } from '../config/env';
import { Request } from 'express';
import crypto from 'crypto';
import path from 'path';

const storage = new GridFsStorage({
  url: env.MONGODB_URI,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) return reject(err);
        const filename = buf.toString('hex') + path.extname(file.originalname);
        const fileInfo = {
          filename: filename,
          bucketName: 'uploads'
        };
        resolve(fileInfo);
      });
    });
  }
});

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
