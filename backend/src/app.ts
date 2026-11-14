import express, { type Express } from 'express';
import cors from 'cors';
import { config } from './config.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { authRoutes } from './routes/auth.routes.js';
import { favoriteRoutes } from './routes/favorites.routes.js';
import {
  metaRoutes,
  professionalRoutes,
} from './routes/professionals.routes.js';

export function createApp(): Express {
  const app = express();

  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ data: { status: 'ok' } });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/professionals', professionalRoutes);
  app.use('/api/favorites', favoriteRoutes);
  app.use('/api', metaRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
