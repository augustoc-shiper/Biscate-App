import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { AppError } from '../lib/AppError.js';

export const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = ALLOWED[file.mimetype] ?? '.bin';
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const multerSinglePhoto = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED[file.mimetype]) {
      cb(new AppError(400, 'INVALID_FILE_TYPE', 'Apenas imagens jpg, png ou webp'));
      return;
    }
    cb(null, true);
  },
}).single('photo');

export function uploadPhotoMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  multerSinglePhoto(req, _res, (err: unknown) => {
    if (!err) {
      next();
      return;
    }
    if (err instanceof AppError) {
      next(err);
      return;
    }
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        next(new AppError(400, 'FILE_TOO_LARGE', 'Máximo 5MB por foto'));
        return;
      }
      next(new AppError(400, 'UPLOAD_ERROR', err.message));
      return;
    }
    next(new AppError(400, 'UPLOAD_ERROR', 'Falha no upload da foto'));
  });
}

