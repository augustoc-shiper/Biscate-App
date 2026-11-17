import type { NextFunction, Request, Response } from 'express';
import { CreatePaymentDto } from '../dto/payments.dto.js';
import { ok } from '../lib/respond.js';
import { systemClock } from '../lib/clock.js';
import {
  storeProofFile,
  type UploadedProof,
} from '../middleware/upload.js';
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
      systemClock(),
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

/**
 * Leitura do estado da subscrição do profissional autenticado.
 * Não altera nada: apenas expõe o que a UI precisa para mostrar os estados.
 */
export async function mySubscription(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    ok(res, await paymentsService.getMySubscription(req.user!.id));
  } catch (err) {
    next(err);
  }
}

export async function sendProof(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const proofUrl = storeProofFile(req.file as UploadedProof | undefined);
    const updated = await paymentsService.attachProof(
      req.user!.id,
      String(req.params.id),
      proofUrl,
      systemClock(),
    );
    ok(res, updated);
  } catch (err) {
    next(err);
  }
}
