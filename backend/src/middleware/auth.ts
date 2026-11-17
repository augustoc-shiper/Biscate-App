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

const ROLE_LABEL: Record<'client' | 'professional' | 'admin', string> = {
  client: 'cliente',
  professional: 'profissional',
  admin: 'administrador',
};

export function requireRole(role: keyof typeof ROLE_LABEL) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user || req.user.role !== role) {
      next(
        new AppError(
          403,
          'FORBIDDEN',
          'Acesso reservado a contas de ' + ROLE_LABEL[role],
        ),
      );
      return;
    }
    next();
  };
}
