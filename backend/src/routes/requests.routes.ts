import { Router } from 'express';
import * as requestsController from '../controllers/requests.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const requestRoutes = Router();
export const offerRoutes = Router();

requestRoutes.post(
  '/',
  requireAuth,
  requireRole('client'),
  requestsController.create,
);
requestRoutes.get('/', requireAuth, requestsController.list);
requestRoutes.post(
  '/:id/offers',
  requireAuth,
  requireRole('professional'),
  requestsController.createOffer,
);

offerRoutes.post('/:id/accept', requireAuth, requestsController.accept);
offerRoutes.post('/:id/decline', requireAuth, requestsController.decline);
