import { Router } from 'express';
import { getIssuerProfileHandler, upsertIssuerProfileHandler } from '../controllers/issuer-profile.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireAnyPermission } from '../middlewares/permission.middleware';
import { requireTenant } from '../middlewares/tenant.middleware';
import { asyncHandler } from '../utils/asyncHandler';

export const issuerProfileRoutes = Router();

issuerProfileRoutes.get(
  '/',
  asyncHandler(requireAuth),
  asyncHandler(requireTenant),
  asyncHandler(requireAnyPermission(['tenant:read:self', 'tenant:manage:members', 'issuerProfile:read'])),
  asyncHandler(getIssuerProfileHandler),
);

issuerProfileRoutes.put(
  '/',
  asyncHandler(requireAuth),
  asyncHandler(requireTenant),
  asyncHandler(requireAnyPermission(['tenant:manage:members', 'issuerProfile:manage'])),
  asyncHandler(upsertIssuerProfileHandler),
);
