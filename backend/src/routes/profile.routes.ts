import { Router } from 'express';
import * as profileController from '../controllers/profile.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { uploadPhotoMiddleware } from '../middleware/upload.js';

export const dashboardRoutes = Router();
export const profileRoutes = Router();

dashboardRoutes.get(
  '/',
  requireAuth,
  requireRole('professional'),
  profileController.dashboard,
);

profileRoutes.put(
  '/',
  requireAuth,
  requireRole('professional'),
  profileController.update,
);
profileRoutes.post(
  '/photos',
  requireAuth,
  requireRole('professional'),
  uploadPhotoMiddleware,
  profileController.addPhoto,
);
profileRoutes.delete(
  '/photos/:id',
  requireAuth,
  requireRole('professional'),
  profileController.removePhoto,
);
