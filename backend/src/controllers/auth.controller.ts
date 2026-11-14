import type { NextFunction, Request, Response } from 'express';
import { LoginDto, RegisterDto } from '../dto/auth.dto.js';
import { ok } from '../lib/respond.js';
import * as authService from '../services/auth.service.js';

export async function register(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = RegisterDto.parse(req.body);
    const result = await authService.register(input);
    ok(res, result, 201);
  } catch (err) {
    next(err);
  }
}

export async function login(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = LoginDto.parse(req.body);
    const result = await authService.login(input);
    ok(res, result);
  } catch (err) {
    next(err);
  }
}

export async function me(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = await authService.getUserById(req.user!.id);
    ok(res, user);
  } catch (err) {
    next(err);
  }
}
