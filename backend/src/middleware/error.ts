import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../lib/AppError.js';

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({
    error: { message: 'Recurso não encontrado', code: 'NOT_FOUND' },
  });
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res
      .status(err.status)
      .json({ error: { message: err.message, code: err.code } });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        message: 'Dados inválidos',
        code: 'VALIDATION_ERROR',
        details: err.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      },
    });
    return;
  }
  res
    .status(500)
    .json({ error: { message: 'Erro interno do servidor', code: 'INTERNAL' } });
}
