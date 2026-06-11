import { Router } from 'express';
import {
  archiveVendorHandler,
  createVendorHandler,
  getVendorHandler,
  listVendorsHandler,
  updateVendorHandler,
} from '../controllers/vendors.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireAnyPermission, requirePermission } from '../middlewares/permission.middleware';
import { requireTenant } from '../middlewares/tenant.middleware';
import { asyncHandler } from '../utils/asyncHandler';

export const vendorsRoutes = Router();

vendorsRoutes.get(
  '/',
  asyncHandler(requireAuth),
  asyncHandler(requireTenant),
  asyncHandler(requireAnyPermission(['vendor:read', 'vendor:manage'])),
  asyncHandler(listVendorsHandler),
);
vendorsRoutes.get(
  '/:vendorId',
  asyncHandler(requireAuth),
  asyncHandler(requireTenant),
  asyncHandler(requireAnyPermission(['vendor:read', 'vendor:manage'])),
  asyncHandler(getVendorHandler),
);
vendorsRoutes.post(
  '/',
  asyncHandler(requireAuth),
  asyncHandler(requireTenant),
  asyncHandler(requirePermission('vendor:manage')),
  asyncHandler(createVendorHandler),
);
vendorsRoutes.patch(
  '/:vendorId',
  asyncHandler(requireAuth),
  asyncHandler(requireTenant),
  asyncHandler(requirePermission('vendor:manage')),
  asyncHandler(updateVendorHandler),
);
vendorsRoutes.delete(
  '/:vendorId',
  asyncHandler(requireAuth),
  asyncHandler(requireTenant),
  asyncHandler(requirePermission('vendor:manage')),
  asyncHandler(archiveVendorHandler),
);
