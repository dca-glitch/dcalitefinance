import { Router } from 'express';
import {
  current,
  members,
  updateMemberRolesHandler,
  updateMemberStatusHandler,
} from '../controllers/tenant.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { requirePermission } from '../middlewares/permission.middleware';
import { requireTenant } from '../middlewares/tenant.middleware';
import { asyncHandler } from '../utils/asyncHandler';

export const tenantRoutes = Router();

tenantRoutes.get('/current', asyncHandler(requireAuth), asyncHandler(requireTenant), asyncHandler(current));
tenantRoutes.get(
  '/members',
  asyncHandler(requireAuth),
  asyncHandler(requireTenant),
  asyncHandler(requirePermission('tenant:read:members')),
  asyncHandler(members),
);
tenantRoutes.patch(
  '/members/:userId/roles',
  asyncHandler(requireAuth),
  asyncHandler(requireTenant),
  asyncHandler(requirePermission('tenant:manage:members')),
  asyncHandler(updateMemberRolesHandler),
);
tenantRoutes.patch(
  '/members/:userId/status',
  asyncHandler(requireAuth),
  asyncHandler(requireTenant),
  asyncHandler(requirePermission('tenant:manage:members')),
  asyncHandler(updateMemberStatusHandler),
);
