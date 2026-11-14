import { Router } from 'express';
import * as favoritesController from '../controllers/favorites.controller.js';
import { requireAuth } from '../middleware/auth.js';

export const favoriteRoutes = Router();

favoriteRoutes.post('/:professionalId', requireAuth, favoritesController.toggle);
favoriteRoutes.get('/', requireAuth, favoritesController.list);
