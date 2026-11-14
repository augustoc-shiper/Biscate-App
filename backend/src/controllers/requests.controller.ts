import type { NextFunction, Request, Response } from 'express';
import { CreateOfferDto, CreateRequestDto } from '../dto/requests.dto.js';
import { ok } from '../lib/respond.js';
import * as requestsService from '../services/requests.service.js';

export async function create(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = CreateRequestDto.parse(req.body);
    const created = await requestsService.createRequest(req.user!.id, input);
    ok(res, created, 201);
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
    ok(res, await requestsService.listRequests(req.user!.id));
  } catch (err) {
    next(err);
  }
}

export async function createOffer(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = CreateOfferDto.parse(req.body);
    const created = await requestsService.createOffer(
      req.user!.id,
      String(req.params.id),
      input,
    );
    ok(res, created, 201);
  } catch (err) {
    next(err);
  }
}

export async function accept(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await requestsService.acceptOffer(
      req.user!.id,
      String(req.params.id),
    );
    ok(res, result);
  } catch (err) {
    next(err);
  }
}

export async function decline(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await requestsService.declineOffer(
      req.user!.id,
      String(req.params.id),
    );
    ok(res, result);
  } catch (err) {
    next(err);
  }
}
