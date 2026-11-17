import type { NextFunction, Request, Response } from 'express';
import { systemClock } from '../lib/clock.js';
import { ok } from '../lib/respond.js';
import { AppError } from '../lib/AppError.js';
import { resolveProofPath } from '../middleware/upload.js';
import * as paymentsService from '../services/payments.service.js';

export async function listPayments(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    ok(res, await paymentsService.listAdminPayments());
  } catch (err) {
    next(err);
  }
}

export async function approve(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await paymentsService.approvePayment(
      String(req.params.id),
      req.user!.id,
      systemClock(),
    );
    ok(res, {
      payment: result.payment,
      subscription: result.subscription ?? null,
      applied: result.applied,
    });
  } catch (err) {
    next(err);
  }
}

export async function reject(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await paymentsService.rejectPayment(
      String(req.params.id),
      req.user!.id,
      systemClock(),
    );
    ok(res, {
      payment: result.payment,
      subscription: result.subscription ?? null,
      rejected: result.rejected,
    });
  } catch (err) {
    next(err);
  }
}

export async function getProof(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const payment = await paymentsService.getPaymentForAdmin(String(req.params.id));
    const filePath = resolveProofPath(payment.proofUrl);
    if (!filePath) {
      throw new AppError(404, 'NOT_FOUND', 'Comprovativo não encontrado');
    }
    res.sendFile(filePath, (err: unknown) => {
      if (err) next(err);
    });
  } catch (err) {
    next(err);
  }
}
