import type { NextFunction, Request, Response } from 'express';
import {
  CreateConversationDto,
  SendMessageDto,
} from '../dto/conversations.dto.js';
import { ok } from '../lib/respond.js';
import * as conversationsService from '../services/conversations.service.js';

export async function create(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = CreateConversationDto.parse(req.body);
    const result = await conversationsService.createConversation(
      req.user!.id,
      input.professionalId,
    );
    ok(res, result, result.created ? 201 : 200);
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
    ok(res, await conversationsService.listConversations(req.user!.id));
  } catch (err) {
    next(err);
  }
}

export async function messages(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await conversationsService.listMessages(
      String(req.params.id),
      req.user!.id,
    );
    res.status(200).json({ data: result.data, meta: result.meta });
  } catch (err) {
    next(err);
  }
}

export async function send(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = SendMessageDto.parse(req.body);
    const created = await conversationsService.sendMessage(
      String(req.params.id),
      req.user!.id,
      input,
    );
    ok(res, created, 201);
  } catch (err) {
    next(err);
  }
}
