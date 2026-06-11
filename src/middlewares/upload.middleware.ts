import type { NextFunction, Request, Response, RequestHandler } from 'express';
import multer, { MulterError } from 'multer';
import { AppError } from '../errors/AppError';

const allowedMimeTypes = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      cb(new AppError('Unsupported file type', 400, 'UNSUPPORTED_FILE_TYPE'));
      return;
    }

    cb(null, true);
  },
});

function normalizeUploadError(error: unknown): Error {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return new AppError('File exceeds 10 MB limit', 400, 'FILE_TOO_LARGE');
    }

    return new AppError('Invalid file upload', 400, 'INVALID_FILE_UPLOAD');
  }

  return error instanceof Error ? error : new AppError('Invalid file upload', 400, 'INVALID_FILE_UPLOAD');
}

export function singleFileUpload(fieldName = 'file'): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    upload.single(fieldName)(req, res, (error) => {
      if (error) {
        next(normalizeUploadError(error));
        return;
      }

      next();
    });
  };
}
