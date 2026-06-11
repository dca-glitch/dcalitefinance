import { Router } from 'express';
import {
  archiveBillHandler,
  createBillAttachmentHandler,
  createBillHandler,
  deleteBillAttachmentHandler,
  getBillHandler,
  listBillAttachmentsHandler,
  listBillsHandler,
  markBillPaidHandler,
  updateBillHandler,
  voidBillHandler,
} from '../controllers/bills.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireAnyPermission, requirePermission } from '../middlewares/permission.middleware';
import { requireTenant } from '../middlewares/tenant.middleware';
import { singleFileUpload } from '../middlewares/upload.middleware';
import { asyncHandler } from '../utils/asyncHandler';

export const billsRoutes = Router();

billsRoutes.get(
  '/',
  asyncHandler(requireAuth),
  asyncHandler(requireTenant),
  asyncHandler(requireAnyPermission(['bill:read', 'bill:manage'])),
  asyncHandler(listBillsHandler),
);
billsRoutes.get(
  '/:billId',
  asyncHandler(requireAuth),
  asyncHandler(requireTenant),
  asyncHandler(requireAnyPermission(['bill:read', 'bill:manage'])),
  asyncHandler(getBillHandler),
);
billsRoutes.post(
  '/',
  asyncHandler(requireAuth),
  asyncHandler(requireTenant),
  asyncHandler(requirePermission('bill:manage')),
  asyncHandler(createBillHandler),
);
billsRoutes.patch(
  '/:billId',
  asyncHandler(requireAuth),
  asyncHandler(requireTenant),
  asyncHandler(requirePermission('bill:manage')),
  asyncHandler(updateBillHandler),
);
billsRoutes.post(
  '/:billId/mark-paid',
  asyncHandler(requireAuth),
  asyncHandler(requireTenant),
  asyncHandler(requirePermission('bill:manage')),
  asyncHandler(markBillPaidHandler),
);
billsRoutes.post(
  '/:billId/void',
  asyncHandler(requireAuth),
  asyncHandler(requireTenant),
  asyncHandler(requirePermission('bill:manage')),
  asyncHandler(voidBillHandler),
);
billsRoutes.delete(
  '/:billId',
  asyncHandler(requireAuth),
  asyncHandler(requireTenant),
  asyncHandler(requirePermission('bill:manage')),
  asyncHandler(archiveBillHandler),
);
billsRoutes.get(
  '/:billId/attachments',
  asyncHandler(requireAuth),
  asyncHandler(requireTenant),
  asyncHandler(requireAnyPermission(['bill:read', 'bill:manage'])),
  asyncHandler(listBillAttachmentsHandler),
);
billsRoutes.post(
  '/:billId/attachments',
  asyncHandler(requireAuth),
  asyncHandler(requireTenant),
  asyncHandler(requirePermission('bill:manage')),
  singleFileUpload('file'),
  asyncHandler(createBillAttachmentHandler),
);
billsRoutes.delete(
  '/:billId/attachments/:attachmentId',
  asyncHandler(requireAuth),
  asyncHandler(requireTenant),
  asyncHandler(requirePermission('bill:manage')),
  asyncHandler(deleteBillAttachmentHandler),
);
