import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { env } from './config/env';
import { authRoutes } from './routes/auth.routes';
import { healthRoutes } from './routes/health.routes';
import { requestIdMiddleware } from './middlewares/requestId.middleware';
import { httpLoggerMiddleware } from './middlewares/httpLogger.middleware';
import { notFoundMiddleware } from './middlewares/notFound.middleware';
import { errorMiddleware } from './middlewares/error.middleware';

export function createApp(): express.Express {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', env.TRUST_PROXY_HOPS);

  const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
  });

  const loginRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: (req) => {
      const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : 'unknown';
      return `${req.ip}:${email}`;
    },
  });

  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(requestIdMiddleware);
  app.use(httpLoggerMiddleware);

  app.use(env.API_PREFIX + '/health', healthRoutes);
  app.use(env.API_PREFIX + '/auth/login', loginRateLimiter);
  app.use(env.API_PREFIX + '/auth', authRateLimiter, authRoutes);

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}
