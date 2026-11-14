import { Router } from 'express';
import * as reviewsController from '../controllers/reviews.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const reviewRoutes = Router();

reviewRoutes.post(
  '/',
  requireAuth,
  requireRole('client'),
  reviewsController.create,
);
