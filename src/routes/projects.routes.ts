import { Router } from 'express';
import {
  archiveProjectHandler,
  createProjectHandler,
  getProjectHandler,
  listProjectsHandler,
  updateProjectHandler,
} from '../controllers/projects.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireAnyPermission, requirePermission } from '../middlewares/permission.middleware';
import { requireTenant } from '../middlewares/tenant.middleware';
import { asyncHandler } from '../utils/asyncHandler';

export const projectsRoutes = Router();

projectsRoutes.get(
  '/',
  asyncHandler(requireAuth),
  asyncHandler(requireTenant),
  asyncHandler(requireAnyPermission(['project:read', 'project:manage'])),
  asyncHandler(listProjectsHandler),
);
projectsRoutes.get(
  '/:projectId',
  asyncHandler(requireAuth),
  asyncHandler(requireTenant),
  asyncHandler(requireAnyPermission(['project:read', 'project:manage'])),
  asyncHandler(getProjectHandler),
);
projectsRoutes.post(
  '/',
  asyncHandler(requireAuth),
  asyncHandler(requireTenant),
  asyncHandler(requirePermission('project:manage')),
  asyncHandler(createProjectHandler),
);
projectsRoutes.patch(
  '/:projectId',
  asyncHandler(requireAuth),
  asyncHandler(requireTenant),
  asyncHandler(requirePermission('project:manage')),
  asyncHandler(updateProjectHandler),
);
projectsRoutes.delete(
  '/:projectId',
  asyncHandler(requireAuth),
  asyncHandler(requireTenant),
  asyncHandler(requirePermission('project:manage')),
  asyncHandler(archiveProjectHandler),
);
