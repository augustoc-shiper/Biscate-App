import { Router } from 'express';
import * as paymentsController from '../controllers/payments.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { uploadProofMiddleware } from '../middleware/upload.js';

export const planRoutes = Router();
export const paymentRoutes = Router();
export const subscriptionRoutes = Router();

planRoutes.get('/', paymentsController.listPlans);

// Endpoint de leitura mínimo para a UI do profissional (sem escrita, sem BD alterada).
subscriptionRoutes.get(
  '/me',
  requireAuth,
  requireRole('professional'),
  paymentsController.mySubscription,
);

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
// O comprovativo é enviado pelo profissional; a confirmação é feita pelo admin.
paymentRoutes.post(
  '/:id/proof',
  requireAuth,
  requireRole('professional'),
  uploadProofMiddleware,
  paymentsController.sendProof,
);
