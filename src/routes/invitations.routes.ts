import { Router } from 'express';
import { createInvitation } from '../controllers/invitations.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { requirePermission } from '../middlewares/permission.middleware';
import { requireTenant } from '../middlewares/tenant.middleware';
import { asyncHandler } from '../utils/asyncHandler';

export const invitationsRoutes = Router();

invitationsRoutes.post(
  '/',
  asyncHandler(requireAuth),
  asyncHandler(requireTenant),
  asyncHandler(requirePermission('tenant:manage:members')),
  asyncHandler(createInvitation),
);
