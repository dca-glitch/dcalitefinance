import type { Request, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../errors/AppError';
import { toJsonSafe } from '../utils/json';
import {
  archiveProject as archiveProjectService,
  createProject as createProjectService,
  getProject as getProjectService,
  listProjects as listProjectsService,
  updateProject as updateProjectService,
} from '../services/projects.service';

const projectIdSchema = z.string().uuid();

const listProjectsQuerySchema = z.object({
  search: z.string().trim().min(1).max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const projectBodySchema = z.object({
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).max(5000).nullable().optional(),
  clientId: z.string().uuid().nullable().optional(),
});

function requireAuthAndTenant(req: Request): { userId: string; tenantId: string } {
  if (!req.auth) {
    throw new AppError('Unauthenticated', 401, 'UNAUTHENTICATED');
  }

  if (!req.tenant) {
    throw new AppError('Tenant context required', 400, 'TENANT_CONTEXT_REQUIRED');
  }

  return {
    userId: req.auth.userId,
    tenantId: req.tenant.id,
  };
}

export async function listProjectsHandler(req: Request, res: Response): Promise<void> {
  const context = requireAuthAndTenant(req);
  const parsed = listProjectsQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    throw new AppError('Invalid project query', 400, 'INVALID_PROJECT_QUERY');
  }

  const result = await listProjectsService({
    tenantId: context.tenantId,
    search: parsed.data.search,
    page: parsed.data.page,
    limit: parsed.data.limit,
  });

  res.status(200).json(
    toJsonSafe({
      success: true,
      data: result,
    }),
  );
}

export async function getProjectHandler(req: Request, res: Response): Promise<void> {
  const context = requireAuthAndTenant(req);
  const projectId = projectIdSchema.parse(req.params.projectId);
  const project = await getProjectService({
    tenantId: context.tenantId,
    projectId,
  });

  res.status(200).json(
    toJsonSafe({
      success: true,
      data: {
        project,
      },
    }),
  );
}

export async function createProjectHandler(req: Request, res: Response): Promise<void> {
  const context = requireAuthAndTenant(req);
  const parsed = projectBodySchema.safeParse(req.body);

  if (!parsed.success) {
    throw new AppError('Invalid project payload', 400, 'INVALID_PROJECT_PAYLOAD');
  }

  const project = await createProjectService({
    tenantId: context.tenantId,
    actorUserId: context.userId,
    request: req,
    name: parsed.data.name,
    description: parsed.data.description ?? undefined,
    clientId: parsed.data.clientId,
  });

  res.status(201).json(
    toJsonSafe({
      success: true,
      data: {
        project,
      },
    }),
  );
}

export async function updateProjectHandler(req: Request, res: Response): Promise<void> {
  const context = requireAuthAndTenant(req);
  const projectId = projectIdSchema.parse(req.params.projectId);
  const parsed = projectBodySchema.partial().safeParse(req.body);

  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    throw new AppError('Invalid project update payload', 400, 'INVALID_PROJECT_UPDATE_PAYLOAD');
  }

  const project = await updateProjectService({
    tenantId: context.tenantId,
    actorUserId: context.userId,
    request: req,
    projectId,
    name: parsed.data.name,
    description: parsed.data.description,
    clientId: parsed.data.clientId,
  });

  res.status(200).json(
    toJsonSafe({
      success: true,
      data: {
        project,
      },
    }),
  );
}

export async function archiveProjectHandler(req: Request, res: Response): Promise<void> {
  const context = requireAuthAndTenant(req);
  const projectId = projectIdSchema.parse(req.params.projectId);
  const project = await archiveProjectService({
    tenantId: context.tenantId,
    actorUserId: context.userId,
    request: req,
    projectId,
  });

  res.status(200).json(
    toJsonSafe({
      success: true,
      data: {
        project,
      },
    }),
  );
}
