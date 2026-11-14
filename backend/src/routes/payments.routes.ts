import { Router } from 'express';
import * as paymentsController from '../controllers/payments.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const planRoutes = Router();
export const paymentRoutes = Router();

planRoutes.get('/', paymentsController.listPlans);

paymentRoutes.post(
  '/',
  requireAuth,
  requireRole('professional'),
  paymentsController.create,
);
paymentRoutes.get(
  '/',
  requireAuth,
  requireRole('professional'),
  paymentsController.list,
);
paymentRoutes.post(
  '/:id/confirm',
  requireAuth,
  requireRole('professional'),
  paymentsController.confirm,
);
