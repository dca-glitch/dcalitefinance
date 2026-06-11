import { Router } from 'express';
import {
  archiveRecurringInvoiceHandler,
  createRecurringInvoiceHandler,
  generateRecurringInvoiceNowHandler,
  getRecurringInvoiceHandler,
  listRecurringInvoicesHandler,
  pauseRecurringInvoiceHandler,
  resumeRecurringInvoiceHandler,
  updateRecurringInvoiceHandler,
} from '../controllers/recurring-invoices.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireAnyPermission, requirePermission } from '../middlewares/permission.middleware';
import { requireTenant } from '../middlewares/tenant.middleware';
import { asyncHandler } from '../utils/asyncHandler';

export const recurringInvoicesRoutes = Router();

recurringInvoicesRoutes.get(
  '/',
  asyncHandler(requireAuth),
  asyncHandler(requireTenant),
  asyncHandler(requireAnyPermission(['recurringInvoice:read', 'recurringInvoice:manage'])),
  asyncHandler(listRecurringInvoicesHandler),
);
recurringInvoicesRoutes.get(
  '/:recurringInvoiceId',
  asyncHandler(requireAuth),
  asyncHandler(requireTenant),
  asyncHandler(requireAnyPermission(['recurringInvoice:read', 'recurringInvoice:manage'])),
  asyncHandler(getRecurringInvoiceHandler),
);
recurringInvoicesRoutes.post(
  '/',
  asyncHandler(requireAuth),
  asyncHandler(requireTenant),
  asyncHandler(requirePermission('recurringInvoice:manage')),
  asyncHandler(createRecurringInvoiceHandler),
);
recurringInvoicesRoutes.patch(
  '/:recurringInvoiceId',
  asyncHandler(requireAuth),
  asyncHandler(requireTenant),
  asyncHandler(requirePermission('recurringInvoice:manage')),
  asyncHandler(updateRecurringInvoiceHandler),
);
recurringInvoicesRoutes.post(
  '/:recurringInvoiceId/pause',
  asyncHandler(requireAuth),
  asyncHandler(requireTenant),
  asyncHandler(requirePermission('recurringInvoice:manage')),
  asyncHandler(pauseRecurringInvoiceHandler),
);
recurringInvoicesRoutes.post(
  '/:recurringInvoiceId/resume',
  asyncHandler(requireAuth),
  asyncHandler(requireTenant),
  asyncHandler(requirePermission('recurringInvoice:manage')),
  asyncHandler(resumeRecurringInvoiceHandler),
);
recurringInvoicesRoutes.post(
  '/:recurringInvoiceId/generate-now',
  asyncHandler(requireAuth),
  asyncHandler(requireTenant),
  asyncHandler(requirePermission('recurringInvoice:manage')),
  asyncHandler(generateRecurringInvoiceNowHandler),
);
recurringInvoicesRoutes.delete(
  '/:recurringInvoiceId',
  asyncHandler(requireAuth),
  asyncHandler(requireTenant),
  asyncHandler(requirePermission('recurringInvoice:manage')),
  asyncHandler(archiveRecurringInvoiceHandler),
);
