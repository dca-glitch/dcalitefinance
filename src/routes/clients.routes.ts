import { Router } from 'express';
import {
  createClientHandler,
  deleteClientHandler,
  getClientHandler,
  listClientsHandler,
  updateClientHandler,
} from '../controllers/clients.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireAnyPermission, requirePermission } from '../middlewares/permission.middleware';
import { requireTenant } from '../middlewares/tenant.middleware';
import { asyncHandler } from '../utils/asyncHandler';

export const clientsRoutes = Router();

clientsRoutes.get(
  '/',
  asyncHandler(requireAuth),
  asyncHandler(requireTenant),
  asyncHandler(requireAnyPermission(['client:read', 'client:manage'])),
  asyncHandler(listClientsHandler),
);
clientsRoutes.get(
  '/:clientId',
  asyncHandler(requireAuth),
  asyncHandler(requireTenant),
  asyncHandler(requireAnyPermission(['client:read', 'client:manage'])),
  asyncHandler(getClientHandler),
);
clientsRoutes.post(
  '/',
  asyncHandler(requireAuth),
  asyncHandler(requireTenant),
  asyncHandler(requirePermission('client:manage')),
  asyncHandler(createClientHandler),
);
clientsRoutes.patch(
  '/:clientId',
  asyncHandler(requireAuth),
  asyncHandler(requireTenant),
  asyncHandler(requirePermission('client:manage')),
  asyncHandler(updateClientHandler),
);
clientsRoutes.delete(
  '/:clientId',
  asyncHandler(requireAuth),
  asyncHandler(requireTenant),
  asyncHandler(requirePermission('client:manage')),
  asyncHandler(deleteClientHandler),
);
