import express, { type Express } from 'express';
import cors from 'cors';
import { config } from './config.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { UPLOAD_DIR } from './middleware/upload.js';
import { authRoutes } from './routes/auth.routes.js';
import { conversationRoutes } from './routes/conversations.routes.js';
import { favoriteRoutes } from './routes/favorites.routes.js';
import {
  metaRoutes,
  professionalRoutes,
} from './routes/professionals.routes.js';
import {
  offerRoutes,
  requestRoutes,
} from './routes/requests.routes.js';
import { paymentRoutes, planRoutes } from './routes/payments.routes.js';
import {
  dashboardRoutes,
  profileRoutes,
} from './routes/profile.routes.js';
import { reviewRoutes } from './routes/reviews.routes.js';

export function createApp(): Express {
  const app = express();

  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json());
  app.use('/uploads', express.static(UPLOAD_DIR));

  app.get('/api/health', (_req, res) => {
    res.json({ data: { status: 'ok' } });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/professionals', professionalRoutes);
  app.use('/api/favorites', favoriteRoutes);
  app.use('/api/requests', requestRoutes);
  app.use('/api/offers', offerRoutes);
  app.use('/api/conversations', conversationRoutes);
  app.use('/api/reviews', reviewRoutes);
  app.use('/api/plans', planRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/profile', profileRoutes);
  app.use('/api', metaRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
