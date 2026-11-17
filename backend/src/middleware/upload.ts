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

/* ------------------------------------------------------------------ *
 * Comprovativo de pagamento: MIME + extensão + bytes mágicos (5 MB).  *
 * PDF é rejeitado explicitamente.                                     *
 * ------------------------------------------------------------------ */

const PROOF_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const multerSingleProof = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!PROOF_MIME[file.mimetype]) {
      cb(
        new AppError(
          400,
          'INVALID_FILE_TYPE',
          ' Comprovativo: apenas jpg, png ou webp (PDF não aceite)',
        ),
      );
      return;
    }
    cb(null, true);
  },
}).single('proof');

export function uploadProofMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  multerSingleProof(req, res, (err: unknown) => {
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
        next(new AppError(400, 'FILE_TOO_LARGE', 'Comprovativo: máximo 5MB'));
        return;
      }
      next(new AppError(400, 'UPLOAD_ERROR', err.message));
      return;
    }
    next(new AppError(400, 'UPLOAD_ERROR', 'Falha no upload do comprovativo'));
  });
}

export type UploadedProof = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
};

function hasMagic(file: UploadedProof): boolean {
  const b = file.buffer;
  if (b.length < 12) return false;
  switch (file.mimetype) {
    case 'image/jpeg':
      return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
    case 'image/png':
      return (
        b[0] === 0x89 &&
        b[1] === 0x50 &&
        b[2] === 0x4e &&
        b[3] === 0x47 &&
        b[4] === 0x0d &&
        b[5] === 0x0a &&
        b[6] === 0x1a &&
        b[7] === 0x0a
      );
    case 'image/webp':
      return (
        b.toString('ascii', 0, 4) === 'RIFF' &&
        b.toString('ascii', 8, 12) === 'WEBP'
      );
    default:
      return false;
  }
}

/** Valida os bytes mágicos e grava o comprovativo. Devolve a URL relativa. */
export function storeProofFile(file: UploadedProof | undefined): string {
  if (!file) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Comprovativo é obrigatório');
  }
  const ext = PROOF_MIME[file.mimetype];
  if (!ext) {
    throw new AppError(400, 'INVALID_FILE_TYPE', 'Apenas jpg, png ou webp');
  }
  if (!hasMagic(file)) {
    throw new AppError(
      400,
      'INVALID_FILE_TYPE',
      'O conteúdo do ficheiro não corresponde à imagem declarada',
    );
  }
  const name = `${crypto.randomUUID()}${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, name), file.buffer);
  return `/uploads/${name}`;
}

/** Resolve a URL guardada para um caminho dentro de UPLOAD_DIR (anti-traversal). */
export function resolveProofPath(proofUrl: string | null): string | null {
  if (!proofUrl) return null;
  const name = path.basename(proofUrl);
  const full = path.resolve(UPLOAD_DIR, name);
  if (full !== path.join(UPLOAD_DIR, name)) return null;
  return fs.existsSync(full) ? full : null;
}
