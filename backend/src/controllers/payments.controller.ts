import type { NextFunction, Request, Response } from 'express';
import { CreatePaymentDto } from '../dto/payments.dto.js';
import { ok } from '../lib/respond.js';
import * as paymentsService from '../services/payments.service.js';

export async function listPlans(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    ok(res, await paymentsService.listPlans());
  } catch (err) {
    next(err);
  }
}

export async function create(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = CreatePaymentDto.parse(req.body);
    const created = await paymentsService.createPayment(
      req.user!.id,
      input.planId,
    );
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
    ok(res, await paymentsService.listPayments(req.user!.id));
  } catch (err) {
    next(err);
  }
}

export async function confirm(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const updated = await paymentsService.confirmPayment(
      req.user!.id,
      String(req.params.id),
    );
    ok(res, updated);
  } catch (err) {
    next(err);
  }
}
