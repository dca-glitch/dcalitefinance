import { Router } from 'express';
import {
  createRoleHandler,
  listTenantRolesHandler,
  updateRoleHandler,
} from '../controllers/roles.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { requirePermission } from '../middlewares/permission.middleware';
import { requireTenant } from '../middlewares/tenant.middleware';
import { asyncHandler } from '../utils/asyncHandler';

export const rolesRoutes = Router();

rolesRoutes.get(
  '/',
  asyncHandler(requireAuth),
  asyncHandler(requireTenant),
  asyncHandler(requirePermission('role:read')),
  asyncHandler(listTenantRolesHandler),
);
rolesRoutes.post(
  '/',
  asyncHandler(requireAuth),
  asyncHandler(requireTenant),
  asyncHandler(requirePermission('role:manage')),
  asyncHandler(createRoleHandler),
);
rolesRoutes.patch(
  '/:roleId',
  asyncHandler(requireAuth),
  asyncHandler(requireTenant),
  asyncHandler(requirePermission('role:manage')),
  asyncHandler(updateRoleHandler),
);
