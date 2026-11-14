import type { NextFunction, Request, Response } from 'express';
import { ok } from '../lib/respond.js';
import * as favoritesService from '../services/favorites.service.js';

export async function toggle(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await favoritesService.toggleFavorite(
      req.user!.id,
      String(req.params.professionalId),
    );
    ok(res, result);
  } catch (err) {
    next(err);
  }
}

export async function list(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    ok(res, await favoritesService.listFavorites(req.user!.id));
  } catch (err) {
    next(err);
  }
}
