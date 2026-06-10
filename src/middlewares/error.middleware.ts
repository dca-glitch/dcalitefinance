import type { NextFunction, Request, Response } from 'express';
import { logger } from '../config/logger';
import { AppError } from '../errors/AppError';
import { toJsonSafe } from '../utils/json';

export function errorMiddleware(error: Error, req: Request, res: Response, _next: NextFunction): void {
  const isAppError = error instanceof AppError;
  const statusCode = isAppError ? error.statusCode : 500;
  const code = isAppError ? error.code : 'INTERNAL_ERROR';

  logger.error(
    {
      err: error,
      requestId: req.requestId,
      path: req.originalUrl,
      method: req.method,
    },
    'Request failed',
  );

  res.status(statusCode).json(
    toJsonSafe({
      success: false,
      error: {
        code,
        message: isAppError ? error.message : 'Internal server error',
        requestId: req.requestId,
      },
    }),
  );
}
