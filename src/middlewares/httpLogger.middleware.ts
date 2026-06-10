import type { Request } from 'express';
import pinoHttp from 'pino-http';
import { logger } from '../config/logger';

export const httpLoggerMiddleware = pinoHttp({
  logger,
  customProps: (request) => ({
    requestId: (request as Request).requestId,
  }),
});
