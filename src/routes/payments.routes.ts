import { Router } from 'express';
import {
  createPaymentAttachmentHandler,
  createPaymentHandler,
  deletePaymentAttachmentHandler,
  getPaymentHandler,
  listPaymentAttachmentsHandler,
  listPaymentsHandler,
  reversePaymentHandler,
} from '../controllers/payments.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireAnyPermission, requirePermission } from '../middlewares/permission.middleware';
import { requireTenant } from '../middlewares/tenant.middleware';
import { singleFileUpload } from '../middlewares/upload.middleware';
import { asyncHandler } from '../utils/asyncHandler';

export const paymentsRoutes = Router();

paymentsRoutes.get(
  '/',
  asyncHandler(requireAuth),
  asyncHandler(requireTenant),
  asyncHandler(requireAnyPermission(['payment:read', 'payment:manage'])),
  asyncHandler(listPaymentsHandler),
);
paymentsRoutes.get(
  '/:paymentId',
  asyncHandler(requireAuth),
  asyncHandler(requireTenant),
  asyncHandler(requireAnyPermission(['payment:read', 'payment:manage'])),
  asyncHandler(getPaymentHandler),
);
paymentsRoutes.post(
  '/',
  asyncHandler(requireAuth),
  asyncHandler(requireTenant),
  asyncHandler(requirePermission('payment:manage')),
  asyncHandler(createPaymentHandler),
);
paymentsRoutes.post(
  '/:paymentId/reverse',
  asyncHandler(requireAuth),
  asyncHandler(requireTenant),
  asyncHandler(requirePermission('payment:manage')),
  asyncHandler(reversePaymentHandler),
);
paymentsRoutes.get(
  '/:paymentId/attachments',
  asyncHandler(requireAuth),
  asyncHandler(requireTenant),
  asyncHandler(requireAnyPermission(['payment:read', 'payment:manage'])),
  asyncHandler(listPaymentAttachmentsHandler),
);
paymentsRoutes.post(
  '/:paymentId/attachments',
  asyncHandler(requireAuth),
  asyncHandler(requireTenant),
  asyncHandler(requirePermission('payment:manage')),
  singleFileUpload('file'),
  asyncHandler(createPaymentAttachmentHandler),
);
paymentsRoutes.delete(
  '/:paymentId/attachments/:attachmentId',
  asyncHandler(requireAuth),
  asyncHandler(requireTenant),
  asyncHandler(requirePermission('payment:manage')),
  asyncHandler(deletePaymentAttachmentHandler),
);
