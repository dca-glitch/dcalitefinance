import { Router } from 'express';
import { getFileAttachmentDocumentHandler } from '../controllers/file-attachments.controller';
import { optionalAuth } from '../middlewares/auth.middleware';
import { asyncHandler } from '../utils/asyncHandler';

export const fileAttachmentsRoutes = Router();

fileAttachmentsRoutes.get(
  '/:attachmentId/document',
  asyncHandler(optionalAuth),
  asyncHandler(getFileAttachmentDocumentHandler),
);
