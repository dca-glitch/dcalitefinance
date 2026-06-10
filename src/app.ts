import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env';
import { healthRoutes } from './routes/health.routes';
import { requestIdMiddleware } from './middlewares/requestId.middleware';
import { httpLoggerMiddleware } from './middlewares/httpLogger.middleware';
import { notFoundMiddleware } from './middlewares/notFound.middleware';
import { errorMiddleware } from './middlewares/error.middleware';

export function createApp(): express.Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN }));
  app.use(express.json({ limit: '1mb' }));
  app.use(requestIdMiddleware);
  app.use(httpLoggerMiddleware);
  app.use(env.API_PREFIX + '/health', healthRoutes);
  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}
