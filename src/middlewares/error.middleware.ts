import type { NextFunction, Request, Response } from 'express';
import { logger } from '../config/logger';
import { AppError } from '../errors/AppError';
import { toJsonSafe } from '../utils/json';
import { ZodError } from 'zod';

export function errorMiddleware(error: Error, req: Request, res: Response, _next: NextFunction): void {
  const isAppError = error instanceof AppError;
  const isValidationError = error instanceof ZodError;
  const statusCode = isAppError ? error.statusCode : isValidationError ? 400 : 500;
  const code = isAppError ? error.code : isValidationError ? 'INVALID_REQUEST' : 'INTERNAL_ERROR';
  const message = isAppError ? error.message : isValidationError ? 'Invalid request' : 'Internal server error';

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
        message,
        requestId: req.requestId,
      },
    }),
  );
}
