import type { NextFunction, Request, Response } from 'express';
import { ReadNotificationsDto } from '../dto/notifications.dto.js';
import { ok } from '../lib/respond.js';
import * as notificationsService from '../services/notifications.service.js';

export async function list(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await notificationsService.listNotifications(req.user!.id);
    res.status(200).json({ data: result.data, meta: result.meta });
  } catch (err) {
    next(err);
  }
}

export async function markRead(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = ReadNotificationsDto.parse(req.body ?? {});
    const result = await notificationsService.markRead(
      req.user!.id,
      input.ids,
    );
    ok(res, result);
  } catch (err) {
    next(err);
  }
}
