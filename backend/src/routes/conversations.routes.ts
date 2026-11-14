import { Router } from 'express';
import * as conversationsController from '../controllers/conversations.controller.js';
import { requireAuth } from '../middleware/auth.js';

export const conversationRoutes = Router();

conversationRoutes.post('/', requireAuth, conversationsController.create);
conversationRoutes.get('/', requireAuth, conversationsController.list);
conversationRoutes.get(
  '/:id/messages',
  requireAuth,
  conversationsController.messages,
);
conversationRoutes.post(
  '/:id/messages',
  requireAuth,
  conversationsController.send,
);
