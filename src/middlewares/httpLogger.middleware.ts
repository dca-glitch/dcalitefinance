import pinoHttp from 'pino-http';
import { logger } from '../config/logger';

export const httpLoggerMiddleware = pinoHttp({
  logger,
  customProps: (request) => ({
    requestId: request.requestId,
  }),
});
