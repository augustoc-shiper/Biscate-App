import { Router } from 'express';
import * as adminController from '../controllers/admin.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const adminRoutes = Router();

adminRoutes.use(requireAuth);
adminRoutes.use(requireRole('admin'));

adminRoutes.get('/payments', adminController.listPayments);
adminRoutes.get('/payments/:id/proof', adminController.getProof);
adminRoutes.post('/payments/:id/approve', adminController.approve);
adminRoutes.post('/payments/:id/reject', adminController.reject);
