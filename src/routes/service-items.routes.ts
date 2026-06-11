import { Router } from 'express';
import {
  archiveServiceItemHandler,
  createServiceItemHandler,
  getServiceItemHandler,
  listServiceItemsHandler,
  updateServiceItemHandler,
} from '../controllers/service-items.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireAnyPermission, requirePermission } from '../middlewares/permission.middleware';
import { requireTenant } from '../middlewares/tenant.middleware';
import { asyncHandler } from '../utils/asyncHandler';

export const serviceItemsRoutes = Router();

serviceItemsRoutes.get(
  '/',
  asyncHandler(requireAuth),
  asyncHandler(requireTenant),
  asyncHandler(requireAnyPermission(['serviceItem:read', 'serviceItem:manage'])),
  asyncHandler(listServiceItemsHandler),
);
serviceItemsRoutes.get(
  '/:serviceItemId',
  asyncHandler(requireAuth),
  asyncHandler(requireTenant),
  asyncHandler(requireAnyPermission(['serviceItem:read', 'serviceItem:manage'])),
  asyncHandler(getServiceItemHandler),
);
serviceItemsRoutes.post(
  '/',
  asyncHandler(requireAuth),
  asyncHandler(requireTenant),
  asyncHandler(requirePermission('serviceItem:manage')),
  asyncHandler(createServiceItemHandler),
);
serviceItemsRoutes.patch(
  '/:serviceItemId',
  asyncHandler(requireAuth),
  asyncHandler(requireTenant),
  asyncHandler(requirePermission('serviceItem:manage')),
  asyncHandler(updateServiceItemHandler),
);
serviceItemsRoutes.delete(
  '/:serviceItemId',
  asyncHandler(requireAuth),
  asyncHandler(requireTenant),
  asyncHandler(requirePermission('serviceItem:manage')),
  asyncHandler(archiveServiceItemHandler),
);
