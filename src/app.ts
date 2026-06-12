import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { env } from './config/env';
import { authRoutes } from './routes/auth.routes';
import { invitationsRoutes } from './routes/invitations.routes';
import { clientsRoutes } from './routes/clients.routes';
import { vendorsRoutes } from './routes/vendors.routes';
import { expenseCategoriesRoutes } from './routes/expense-categories.routes';
import { projectsRoutes } from './routes/projects.routes';
import { serviceItemsRoutes } from './routes/service-items.routes';
import { invoicesRoutes } from './routes/invoices.routes';
import { issuerProfileRoutes } from './routes/issuer-profile.routes';
import { billsRoutes } from './routes/bills.routes';
import { recurringInvoicesRoutes } from './routes/recurring-invoices.routes';
import { paymentsRoutes } from './routes/payments.routes';
import { fileAttachmentsRoutes } from './routes/file-attachments.routes';
import { rolesRoutes } from './routes/roles.routes';
import { tenantRoutes } from './routes/tenant.routes';
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

  const appApiRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 600,
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
  app.use(env.API_PREFIX + '/invitations', authRateLimiter, invitationsRoutes);

  app.use(env.API_PREFIX + '/tenant', appApiRateLimiter, tenantRoutes);
  app.use(env.API_PREFIX + '/issuer-profile', appApiRateLimiter, issuerProfileRoutes);
  app.use(env.API_PREFIX + '/clients', appApiRateLimiter, clientsRoutes);
  app.use(env.API_PREFIX + '/vendors', appApiRateLimiter, vendorsRoutes);
  app.use(env.API_PREFIX + '/expense-categories', appApiRateLimiter, expenseCategoriesRoutes);
  app.use(env.API_PREFIX + '/projects', appApiRateLimiter, projectsRoutes);
  app.use(env.API_PREFIX + '/service-items', appApiRateLimiter, serviceItemsRoutes);
  app.use(env.API_PREFIX + '/invoices', appApiRateLimiter, invoicesRoutes);
  app.use(env.API_PREFIX + '/bills', appApiRateLimiter, billsRoutes);
  app.use(env.API_PREFIX + '/recurring-invoices', appApiRateLimiter, recurringInvoicesRoutes);
  app.use(env.API_PREFIX + '/payments', appApiRateLimiter, paymentsRoutes);
  app.use(env.API_PREFIX + '/file-attachments', appApiRateLimiter, fileAttachmentsRoutes);
  app.use(env.API_PREFIX + '/roles', appApiRateLimiter, rolesRoutes);

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}
