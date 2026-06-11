import { Router } from 'express';
import {
  createPaymentHandler,
  getPaymentHandler,
  listPaymentsHandler,
  reversePaymentHandler,
} from '../controllers/payments.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireAnyPermission, requirePermission } from '../middlewares/permission.middleware';
import { requireTenant } from '../middlewares/tenant.middleware';
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
