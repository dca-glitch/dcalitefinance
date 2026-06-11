import { Router } from 'express';
import {
  archiveInvoiceHandler,
  createInvoiceHandler,
  getInvoiceHandler,
  listInvoicesHandler,
  updateInvoiceHandler,
} from '../controllers/invoices.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireAnyPermission, requirePermission } from '../middlewares/permission.middleware';
import { requireTenant } from '../middlewares/tenant.middleware';
import { asyncHandler } from '../utils/asyncHandler';

export const invoicesRoutes = Router();

invoicesRoutes.get(
  '/',
  asyncHandler(requireAuth),
  asyncHandler(requireTenant),
  asyncHandler(requireAnyPermission(['invoice:read', 'invoice:manage'])),
  asyncHandler(listInvoicesHandler),
);
invoicesRoutes.get(
  '/:invoiceId',
  asyncHandler(requireAuth),
  asyncHandler(requireTenant),
  asyncHandler(requireAnyPermission(['invoice:read', 'invoice:manage'])),
  asyncHandler(getInvoiceHandler),
);
invoicesRoutes.post(
  '/',
  asyncHandler(requireAuth),
  asyncHandler(requireTenant),
  asyncHandler(requirePermission('invoice:manage')),
  asyncHandler(createInvoiceHandler),
);
invoicesRoutes.patch(
  '/:invoiceId',
  asyncHandler(requireAuth),
  asyncHandler(requireTenant),
  asyncHandler(requirePermission('invoice:manage')),
  asyncHandler(updateInvoiceHandler),
);
invoicesRoutes.delete(
  '/:invoiceId',
  asyncHandler(requireAuth),
  asyncHandler(requireTenant),
  asyncHandler(requirePermission('invoice:manage')),
  asyncHandler(archiveInvoiceHandler),
);
