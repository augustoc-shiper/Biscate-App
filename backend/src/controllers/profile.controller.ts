import type { NextFunction, Request, Response } from 'express';
import { UpdateProfileDto } from '../dto/profile.dto.js';
import { AppError } from '../lib/AppError.js';
import { ok } from '../lib/respond.js';
import * as profileService from '../services/profile.service.js';

export async function dashboard(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    ok(res, await profileService.getDashboard(req.user!.id));
  } catch (err) {
    next(err);
  }
}

export async function update(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = UpdateProfileDto.parse(req.body);
    ok(res, await profileService.updateProfile(req.user!.id, input));
  } catch (err) {
    next(err);
  }
}

export async function addPhoto(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.file) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Falta a foto (campo photo)');
    }
    const created = await profileService.addPhoto(req.user!.id, req.file);
    ok(res, created, 201);
  } catch (err) {
    next(err);
  }
}

export async function removePhoto(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await profileService.removePhoto(req.user!.id, String(req.params.id));
    ok(res, { id: String(req.params.id) });
  } catch (err) {
    next(err);
  }
}
