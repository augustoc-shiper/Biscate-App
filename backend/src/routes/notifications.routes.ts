import { Router } from 'express';
import * as notificationsController from '../controllers/notifications.controller.js';
import { requireAuth } from '../middleware/auth.js';

export const notificationRoutes = Router();

notificationRoutes.get('/', requireAuth, notificationsController.list);
notificationRoutes.post('/read', requireAuth, notificationsController.markRead);
