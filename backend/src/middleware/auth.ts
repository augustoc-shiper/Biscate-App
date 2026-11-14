import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../lib/AppError.js';
import { verifyToken } from '../lib/jwt.js';

export function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    next(new AppError(401, 'UNAUTHORIZED', 'Autenticação necessária'));
    return;
  }
  try {
    req.user = verifyToken(header.slice(7));
    next();
  } catch (err) {
    next(err);
  }
}
